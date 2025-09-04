import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0,
});
function tryParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function callLLM(prompt: string): Promise<string> {
  const result = await llm.invoke(prompt);
  return (result.content as string).trim();
}

/* ----------------- PROMPTS ------------------ */
async function classifyCriminalLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Criminal Law.
Classify the following clause into one of these sub-categories:
- Offenses & Crimes
- Procedures
- Punishments & Sentences
- Rights & Protections
- Jurisdiction & Authority
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}
async function extractCriminalAttributes(clause: string) {
  const prompt = `
Extract structured attributes in JSON:
- OffenseType
- ProcedureStep
- Punishment
- RightsProtections
- Authority
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainCriminalClause(clause: string) {
  const prompt = `
Explain the clause simply, and extract punishment details.
Return JSON:
- Explanation
- PunishmentDetails
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractCaseDetails(clause: string) {
  const prompt = `
Extract details as JSON:
- Complainant
- Investigator
- Court
- Section
- Date
- Punishment
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping case details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this document in simple language.
Return JSON:
- summaryText
- importantPoints[]
Data:
${JSON.stringify(json, null, 2)}`;

  const raw = await callLLM(prompt);
  const parsed = tryParse(raw);

  if (typeof parsed === "object" && parsed.summaryText && parsed.importantPoints) {
    return parsed;
  }
  return { summaryText: raw, importantPoints: [] };
}

/* ----------------- MAIN PIPELINE ------------------ */

export async function processCriminalCase(input: {
  text: string;
  structure: any;
  filename: string;
}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 50,
  });

  const chunks = await splitter.splitText(input.text);

  const explainedClauses: any[] = [];
  const detailedClauses: any[] = [];

  for (const clause of chunks) {
    const subCategory = await classifyCriminalLevel2(clause);
    const attributes = await extractCriminalAttributes(clause);
    const explanation = await explainCriminalClause(clause);
    const caseDetails = await extractCaseDetails(clause);

    explainedClauses.push({
      clause,
      subCategory,
      attributes: tryParse(attributes),
      explanation: tryParse(explanation),
    });

    detailedClauses.push({ caseDetails: tryParse(caseDetails) });
  }

  const cleanedDetailsRaw = await deduplicateDetails(detailedClauses);
  const cleanedDetails = tryParse(cleanedDetailsRaw);

  // Summarize
  const { summaryText, importantPoints } = await summarizeWithAdvice({
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    caseDetails: cleanedDetails,
  });

  /* ----------------- FINAL DISPLAY-READY JSON ------------------ */
  return {
    // Core analysis
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    caseDetails: cleanedDetails,
    summary: summaryText,
    important_points: importantPoints,

    // UI-friendly metadata
    file_name: input.filename,
    title: "Criminal Case Legal Analysis",
    category: "Criminal Law",
    metadata: {
      processed_at: new Date().toISOString(),
      total_clauses: explainedClauses.length,
      source_type: "PDF Upload",
    },

    // Professional summary block for Display.tsx
    summaryObj: {
      summaryText,
      importantPoints,
      whatHappensIfYouIgnoreThis:
        "Ignoring this document could result in missed legal obligations, penalties, or inability to defend your rights.",
      whatYouShouldDoNow: [
        "Review all extracted clauses carefully.",
        "Identify obligations and deadlines.",
        "Seek professional legal consultation.",
        "Keep this analysis stored securely.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed legal professional.",
      mainRisksRightsConsequences:
        "Potential imprisonment, fines, or loss of legal rights under the cited provisions.",
    },

    // Extra sections
    risks: [
      "Legal punishments if obligations are not fulfilled",
      "Financial penalties under certain clauses",
      "Reputational risks in ongoing litigation",
    ],
    recommendations: [
      "Cross-check sections with official criminal law codes.",
      "Map extracted case details to actual court records.",
      "Prepare supporting documents for defense.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyCriminalLevel2: `You are a legal assistant specializing in Criminal Law. Classify ...`,
      extractCriminalAttributes: `Extract structured attributes in JSON ...`,
      explainCriminalClause: `Explain the clause simply, and extract punishment details ...`,
      extractCaseDetails: `Extract details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping case details ...`,
      summarizeWithAdvice: `Summarize this document in simple language ...`,
    },
  };
}
