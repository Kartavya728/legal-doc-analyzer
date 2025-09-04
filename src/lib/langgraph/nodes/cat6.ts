import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0,
});

/** Safe JSON parse */
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

async function classifyGovtLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Government & Administrative Law.
Classify the following clause into one of these sub-categories:
- Administrative Procedures
- Government Powers
- Citizen Rights
- Public Obligations
- Regulatory Bodies
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractGovtAttributes(clause: string) {
  const prompt = `
Extract structured attributes in JSON:
- Procedure
- Authority
- CitizenRights
- Obligations
- RegulatoryBody
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainGovtClause(clause: string) {
  const prompt = `
Explain this government/administrative clause in simple terms.
Return JSON:
- Explanation
- ImpactOnCitizenOrAgency
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractGovtDetails(clause: string) {
  const prompt = `
Extract government/administrative details as JSON:
- Authority
- Department
- Regulation
- Section
- Date
- Obligations
- Rights
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping administrative details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this administrative/government document in simple language.
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

export async function processGovernment(input: {
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
    const subCategory = await classifyGovtLevel2(clause);
    const attributes = await extractGovtAttributes(clause);
    const explanation = await explainGovtClause(clause);
    const details = await extractGovtDetails(clause);

    explainedClauses.push({
      clause,
      subCategory,
      attributes: tryParse(attributes),
      explanation: tryParse(explanation),
    });

    detailedClauses.push({ details: tryParse(details) });
  }

  const cleanedDetailsRaw = await deduplicateDetails(detailedClauses);
  const cleanedDetails = tryParse(cleanedDetailsRaw);

  // Summarize
  const { summaryText, importantPoints } = await summarizeWithAdvice({
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    details: cleanedDetails,
  });

  /* ----------------- FINAL DISPLAY-READY JSON ------------------ */
  return {
    // Core analysis
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    details: cleanedDetails,
    summary: summaryText,
    important_points: importantPoints,

    // UI-friendly metadata
    file_name: input.filename,
    title: "Government & Administrative Legal Analysis",
    category: "Government & Administrative",
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
        "Ignoring this document may result in penalties, compliance failures, or loss of rights before administrative bodies.",
      whatYouShouldDoNow: [
        "Review extracted obligations and rights carefully.",
        "Cross-check regulatory authority requirements.",
        "Seek professional legal consultation.",
        "Keep this analysis stored securely.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed legal professional.",
      mainRisksRightsConsequences:
        "Potential administrative penalties, compliance failures, or missed obligations.",
    },

    // Extra sections
    risks: [
      "Regulatory penalties for non-compliance",
      "Administrative delays or denial of rights",
      "Financial or reputational damage",
    ],
    recommendations: [
      "Map obligations to your compliance calendar.",
      "Consult relevant administrative authority guidelines.",
      "Maintain documentation for audits or reviews.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyGovtLevel2: `You are a legal assistant specializing in Government & Administrative Law. Classify ...`,
      extractGovtAttributes: `Extract structured attributes in JSON ...`,
      explainGovtClause: `Explain this government/administrative clause ...`,
      extractGovtDetails: `Extract government/administrative details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping administrative details ...`,
      summarizeWithAdvice: `Summarize this administrative/government document ...`,
    },
  };
}
