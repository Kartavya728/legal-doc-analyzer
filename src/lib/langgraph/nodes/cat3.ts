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

async function classifyComplianceLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Regulatory & Compliance law.
Classify the following clause into one of these sub-categories:
- Compliance Obligations
- Reporting & Disclosure
- Regulatory Authority
- Penalties & Enforcement
- Risk Management
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractComplianceAttributes(clause: string) {
  const prompt = `
Extract structured compliance attributes in JSON:
- Obligation
- ReportingRequirement
- EnforcementBody
- Penalty
- RiskFactor
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainComplianceClause(clause: string) {
  const prompt = `
Explain this compliance clause simply.
Return JSON:
- Explanation
- ComplianceRisk
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractComplianceDetails(clause: string) {
  const prompt = `
Extract compliance details as JSON:
- Obligation
- ReportingDeadline
- RegulatoryAuthority
- Section
- Penalty
- Risk
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping compliance details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this compliance/regulatory document in simple language.
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

export async function processCompliance(input: {
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
    const subCategory = await classifyComplianceLevel2(clause);
    const attributes = await extractComplianceAttributes(clause);
    const explanation = await explainComplianceClause(clause);
    const details = await extractComplianceDetails(clause);

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
    title: "Regulatory & Compliance Legal Analysis",
    category: "Regulatory & Compliance",
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
        "Ignoring this compliance document may lead to legal penalties, regulatory sanctions, or reputational damage.",
      whatYouShouldDoNow: [
        "Identify compliance obligations and deadlines.",
        "Check reporting requirements and disclosure timelines.",
        "Consult compliance/legal experts.",
        "Maintain proper records for audits.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed compliance/legal professional.",
      mainRisksRightsConsequences:
        "Non-compliance may result in penalties, sanctions, or suspension of licenses.",
    },

    // Extra sections
    risks: [
      "Financial penalties for non-compliance",
      "Regulatory enforcement actions",
      "Reputational damage due to disclosure failures",
    ],
    recommendations: [
      "Set up monitoring for compliance deadlines.",
      "Engage with regulatory bodies proactively.",
      "Cross-verify obligations with internal compliance team.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyComplianceLevel2: `You are a legal assistant specializing in Regulatory & Compliance law. Classify ...`,
      extractComplianceAttributes: `Extract structured compliance attributes in JSON ...`,
      explainComplianceClause: `Explain this compliance clause simply ...`,
      extractComplianceDetails: `Extract compliance details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping compliance details ...`,
      summarizeWithAdvice: `Summarize this compliance/regulatory document ...`,
    },
  };
}
