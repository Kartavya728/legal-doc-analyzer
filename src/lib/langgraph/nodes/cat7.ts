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

async function classifyPersonalLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Personal Legal Documents.
Classify the following clause into one of these sub-categories:
- Identity & Personal Records
- Family & Marriage
- Wills & Inheritance
- Property Ownership
- Miscellaneous Personal Matters
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractPersonalAttributes(clause: string) {
  const prompt = `
Extract structured attributes in JSON:
- Person
- Relation
- DocumentType
- Property
- Rights
- Obligations
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainPersonalClause(clause: string) {
  const prompt = `
Explain this clause in simple language.
Return JSON:
- Explanation
- KeyImplication
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractPersonalDetails(clause: string) {
  const prompt = `
Extract personal document details as JSON:
- PersonName
- Relation
- DocumentType
- Property
- Rights
- Obligations
- Section
- Date
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping personal document details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this personal legal document in simple language.
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

export async function processPersonalDocs(input: {
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
    const subCategory = await classifyPersonalLevel2(clause);
    const attributes = await extractPersonalAttributes(clause);
    const explanation = await explainPersonalClause(clause);
    const details = await extractPersonalDetails(clause);

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
    title: "Personal Legal Document Analysis",
    category: "Personal Legal Documents",
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
        "Ignoring this document may result in disputes over inheritance, property, or personal rights.",
      whatYouShouldDoNow: [
        "Review all extracted clauses carefully.",
        "Confirm names, dates, and relationships.",
        "Seek professional legal consultation for wills or inheritance.",
        "Keep personal legal documents stored securely.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed legal professional.",
      mainRisksRightsConsequences:
        "Potential inheritance disputes, property rights loss, or family law issues.",
    },

    // Extra sections
    risks: [
      "Disputes over inheritance and property rights",
      "Invalid or unenforceable legal documents",
      "Family disputes if obligations are unclear",
    ],
    recommendations: [
      "Cross-check with official personal/legal records.",
      "Confirm validity of wills and inheritance documents.",
      "Update family/legal records as needed.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyPersonalLevel2: `You are a legal assistant specializing in Personal Legal Documents. Classify ...`,
      extractPersonalAttributes: `Extract structured attributes in JSON ...`,
      explainPersonalClause: `Explain this clause in simple language ...`,
      extractPersonalDetails: `Extract personal document details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping personal document details ...`,
      summarizeWithAdvice: `Summarize this personal legal document in simple language ...`,
    },
  };
}
