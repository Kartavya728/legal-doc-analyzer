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

async function classifyGovernanceLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Corporate Governance.
Classify the following clause into one of these sub-categories:
- Board Structure & Authority
- Shareholder Rights
- Reporting & Transparency
- Duties & Responsibilities
- Risk & Compliance
Clause:
"""${clause}"""
Return only the sub-category name.`;
  return callLLM(prompt);
}

async function extractGovernanceAttributes(clause: string) {
  const prompt = `
Extract structured governance attributes in JSON:
- BoardAuthority
- ShareholderRights
- ReportingRequirements
- DutiesResponsibilities
- ComplianceRisks
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function explainGovernanceClause(clause: string) {
  const prompt = `
Explain this corporate governance clause in simple terms.
Return JSON:
- Explanation
- ImpactOnBoardOrShareholders
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function extractGovernanceDetails(clause: string) {
  const prompt = `
Extract corporate governance details as JSON:
- BoardMembers
- Authority
- Shareholder
- RegulationOrSection
- ReportingObligation
- RiskOrLiability
- OtherNotes
Clause:
"""${clause}"""`;
  return callLLM(prompt);
}

async function deduplicateDetails(rawDetails: any) {
  const prompt = `
Deduplicate overlapping corporate governance details. Return JSON list.
Data:
${JSON.stringify(rawDetails, null, 2)}`;
  return callLLM(prompt);
}

async function summarizeWithAdvice(json: any) {
  const prompt = `
Summarize this corporate governance document in simple language.
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

export async function processGovernance(input: {
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
    const subCategory = await classifyGovernanceLevel2(clause);
    const attributes = await extractGovernanceAttributes(clause);
    const explanation = await explainGovernanceClause(clause);
    const details = await extractGovernanceDetails(clause);

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
    title: "Corporate Governance Legal Analysis",
    category: "Corporate Governance Documents",
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
        "Ignoring this governance document could lead to violations of board duties, shareholder disputes, or compliance penalties.",
      whatYouShouldDoNow: [
        "Review all governance obligations carefully.",
        "Ensure board and shareholder responsibilities are clear.",
        "Set up compliance and reporting workflows.",
        "Consult legal/governance advisors.",
      ],
      importantNote:
        "⚠️ This summary is AI-generated. Always verify with a licensed governance/legal professional.",
      mainRisksRightsConsequences:
        "Possible shareholder lawsuits, regulatory actions, or loss of board credibility.",
    },

    // Extra sections
    risks: [
      "Board liability for mismanagement",
      "Regulatory fines for lack of transparency",
      "Shareholder disputes over rights and obligations",
    ],
    recommendations: [
      "Establish clear reporting and disclosure mechanisms.",
      "Document board decisions and shareholder communications.",
      "Perform compliance checks against governance codes.",
    ],

    // Traceability: prompts used
    used_prompts: {
      classifyGovernanceLevel2: `You are a legal assistant specializing in Corporate Governance. Classify ...`,
      extractGovernanceAttributes: `Extract structured governance attributes in JSON ...`,
      explainGovernanceClause: `Explain this corporate governance clause in simple terms ...`,
      extractGovernanceDetails: `Extract corporate governance details as JSON ...`,
      deduplicateDetails: `Deduplicate overlapping corporate governance details ...`,
      summarizeWithAdvice: `Summarize this corporate governance document ...`,
    },
  };
}
