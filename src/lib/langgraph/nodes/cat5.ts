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

async function classifyPropertyLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Property & Real Estate Law.
Classify the following clause into one of these sub-categories:
- Ownership & Title
- Lease & Rental
- Sale & Transfer
- Mortgage & Finance
- Land Use & Zoning
- Dispute & Litigation
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractPropertyAttributes(clause: string) {
  const prompt = `
Extract structured attributes in JSON:
- Owner
- PropertyType
- Location
- Rights
- Obligations
- FinancialTerms
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainPropertyClause(clause: string) {
  const prompt = `
Explain this property/real estate clause in simple language.
Return JSON:
- Explanation
- KeyImplication
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractPropertyDetails(clause: string) {
  const prompt = `
Extract property-related details as JSON:
- Owner
- Buyer/Seller
- Tenant/Landlord
- PropertyType
- Location
- FinancialTerms
- Section
- Date
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping property document details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this property/real estate legal document in simple language.
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

export async function processPropertyDocs(input: {
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
    const subCategory = await classifyPropertyLevel2(clause);
    const attributes = await extractPropertyAttributes(clause);
    const explanation = await explainPropertyClause(clause);
    const details = await extractPropertyDetails(clause);

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
    title: "Property & Real Estate Document Analysis",
    category: "Property & Real Estate",
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
        "Ignoring this document may lead to disputes over ownership, financial liability, or property rights.",
      whatYouShouldDoNow: [
        "Review all extracted clauses carefully.",
        "Verify ownership, obligations, and financial terms.",
        "Seek professional legal consultation before signing.",
        "Store property documents securely.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed legal professional.",
      mainRisksRightsConsequences:
        "Loss of property rights, financial liability, or involvement in legal disputes.",
    },

    // Extra sections
    risks: [
      "Disputes over ownership or transfer",
      "Hidden financial obligations in clauses",
      "Legal penalties for zoning or land use violations",
    ],
    recommendations: [
      "Cross-check ownership with official land/property records.",
      "Confirm financial obligations with banks or lenders.",
      "Seek legal due diligence before property transfer.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyPropertyLevel2: `You are a legal assistant specializing in Property & Real Estate Law. Classify ...`,
      extractPropertyAttributes: `Extract structured attributes in JSON ...`,
      explainPropertyClause: `Explain this property/real estate clause in simple language ...`,
      extractPropertyDetails: `Extract property-related details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping property document details ...`,
      summarizeWithAdvice: `Summarize this property/real estate legal document in simple language ...`,
    },
  };
}
