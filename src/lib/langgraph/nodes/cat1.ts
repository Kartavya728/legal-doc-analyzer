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

/** Criminal Law Pipeline */
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

  const finalJsonBase = {
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    caseDetails: cleanedDetails,
  };

  const { summaryText, importantPoints } = await summarizeWithAdvice(finalJsonBase);

  return {
    ...finalJsonBase,
    summary: summaryText,
    important_points: importantPoints,
  };
}
