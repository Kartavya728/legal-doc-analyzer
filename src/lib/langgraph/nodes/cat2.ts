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

async function classifyContractLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Contracts & Agreements.
Classify the following clause into one of these sub-categories:
- Parties & Definitions
- Rights & Obligations
- Payment Terms
- Termination & Breach
- Dispute Resolution
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractContractAttributes(clause: string) {
  const prompt = `
Extract structured attributes in JSON:
- Parties
- Obligations
- PaymentTerms
- TerminationClause
- DisputeResolution
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainContractClause(clause: string) {
  const prompt = `
Explain this contract clause simply.
Return JSON:
- Explanation
- KeyRisk
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractContractDetails(clause: string) {
  const prompt = `
Extract contract details as JSON:
- PartyA
- PartyB
- Obligation
- Payment
- Termination
- DisputeMechanism
- Section
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping contract details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this contract document in simple language.
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

export async function processContracts(input: {
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
    const subCategory = await classifyContractLevel2(clause);
    const attributes = await extractContractAttributes(clause);
    const explanation = await explainContractClause(clause);
    const details = await extractContractDetails(clause);

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
    title: "Contract & Agreement Legal Analysis",
    category: "Contracts & Agreements",
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
        "Ignoring this contract may lead to breach of obligations, financial penalties, or disputes with the other party.",
      whatYouShouldDoNow: [
        "Review obligations and payment terms carefully.",
        "Check dispute resolution mechanisms.",
        "Consult legal counsel before signing or terminating.",
        "Ensure compliance with deadlines and obligations.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed legal professional.",
      mainRisksRightsConsequences:
        "Potential breach of contract, financial penalties, or litigation.",
    },

    // Extra sections
    risks: [
      "Breach of contract liabilities",
      "Financial loss from missed payments",
      "Legal disputes if terms are violated",
    ],
    recommendations: [
      "Ensure obligations and rights are tracked.",
      "Maintain documentation of all payments and notices.",
      "Use dispute resolution methods outlined in the contract.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyContractLevel2: `You are a legal assistant specializing in Contracts & Agreements. Classify ...`,
      extractContractAttributes: `Extract structured attributes in JSON ...`,
      explainContractClause: `Explain this contract clause simply ...`,
      extractContractDetails: `Extract contract details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping contract details ...`,
      summarizeWithAdvice: `Summarize this contract document in simple language ...`,
    },
  };
}
