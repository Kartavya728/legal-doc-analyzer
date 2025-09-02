import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash", // same as your MODEL
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0,
});

/**
 * Safe JSON parse helper
 */
function tryParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text; // Return original text if parsing fails
  }
}

/**
 * Helper to call model with a prompt
 */
async function callLLM(prompt: string): Promise<string> {
  const result = await llm.invoke(prompt);
  return (result.content as string).trim();
}

/**
 * Level 2: Classify each clause into Criminal Law sub-category
 */
async function classifyCriminalLevel2(clause: string) {
  const prompt = `
You are a legal assistant specializing in Criminal Law.
Classify the following clause into one of these sub-categories 
(or suggest a new but precise sub-category if none fits):
- Offenses & Crimes: Theft, Fraud, Assault, Homicide, Cybercrime
- Procedures: Investigation, Arrest, Bail, Trial Process, Appeals
- Punishments & Sentences: Imprisonment, Fine, Probation/Parole, Death Penalty
- Rights & Protections: Rights of the Accused, Victim Protection, Evidence Rules
- Jurisdiction & Authority: Police Powers, Court Jurisdiction, Prosecutor Roles
Clause:
"""${clause}"""
Return only the sub-category name.`;

  return callLLM(prompt);
}

/**
 * Extract structured attributes for each clause
 */
async function extractCriminalAttributes(clause: string) {
  const prompt = `
You are a legal assistant extracting structured data from criminal law clauses.
From the following clause, extract the attributes in **JSON format** with these keys:
- OffenseType
- ProcedureStep
- Punishment
- RightsProtections
- Authority
- OtherNotes
If an attribute is not present, return null.
Clause:
"""${clause}"""`;

  return callLLM(prompt);
}

/**
 * Generate explanation + punishment details
 */
async function explainCriminalClause(clause: string) {
  const prompt = `
You are a legal assistant. 
Read the following clause and provide:
1. A clear explanation in simple English.  
2. Specific punishment details (imprisonment, fine, both, or none).  
Clause:
"""${clause}"""
Return the output in JSON with keys:
- Explanation
- PunishmentDetails`;

  return callLLM(prompt);
}

/**
 * Extract case details from clause
 */
async function extractCaseDetails(clause: string) {
  const prompt = `
You are a legal assistant. Extract the following details from this criminal law clause:
1. Complainant
2. Investigator / Police Officer
3. Court / Authority
4. Section / Law
5. Date / Time
6. Punishment
7. Other Notes
Return output in JSON format. If a detail is not present, use null.
Clause:
"""${clause}"""`;

  return callLLM(prompt);
}

/**
 * Deduplicate overlapping details
 */
async function deduplicateDetails(rawDetails: any) {
  const prompt = `
You are an expert legal assistant.
You are given a list of extracted legal clauses/details. 
Some may overlap, repeat, or mean the same thing in different words.
Task:
1. Group overlapping/duplicate clauses together.
2. Keep only ONE best simplified version for each group.
3. Return the result as a clean JSON list.
Extracted details:
${JSON.stringify(rawDetails, null, 2)}
Return format: JSON list only.`;

  return callLLM(prompt);
}

/**
 * Summarize with advice and extract important points
 */
async function summarizeWithAdvice(json: any) {
  const prompt = `
You are a legal assistant AI.
You are given in list format which contains:
1. Legal document category
2. Extracted clauses
3. Their explanations
4. Important background knowledge 
${JSON.stringify(json, null, 2)}
Task:
- Write in very **simple, everyday language**.
- Structure the output in 4 parts:
1. **What this document means for you**  
   - Summarize the accusations or obligations in 3-5 short bullet points.  
2. **What happens if you ignore this**  
   - Clearly state possible punishments, fines, or risks.  
3. **What you should do now**  
   - Give 2-3 simple, practical steps.  
4. **Important Note**  
   - Always add: "This is not legal advice. Please consult a qualified lawyer for proper guidance."  
5. Clearly explain the **main risks, rights, and consequences**.
Avoid jargon. Be clear, short, and supportive.
Return the output in JSON format with keys:
- summaryText: The full summary as a single string.
- importantPoints: An array of strings, each representing a bullet point from the "What this document means for you" section.`;

  const rawSummary = await callLLM(prompt);
  const parsedSummary = tryParse(rawSummary);

  if (typeof parsedSummary === 'object' && parsedSummary !== null && 'summaryText' in parsedSummary && 'importantPoints' in parsedSummary) {
    return parsedSummary;
  } else {
    // Fallback if LLM doesn't return perfect JSON or specific keys
    const lines = String(rawSummary).split('\n');
    const points: string[] = [];
    let inPointsSection = false;
    for (const line of lines) {
      if (line.includes('What this document means for you')) {
        inPointsSection = true;
        continue;
      }
      if (inPointsSection && line.startsWith('- ')) {
        points.push(line.substring(2).trim());
      }
      if (inPointsSection && !line.startsWith('- ') && line.trim() !== '' && !line.includes('What happens if you ignore this')) {
        // If we hit another non-bullet point line that's not the next section, stop collecting points
        inPointsSection = false;
      }
    }
    return {
      summaryText: rawSummary,
      importantPoints: points,
    };
  }
}

/**
 * Main Cat1 pipeline for Criminal Law
 */
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

  // Step 1: classify + extract attributes for each clause
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

  // Step 2: deduplicate case details
  const cleanedDetailsRaw = await deduplicateDetails(detailedClauses);
  const cleanedDetails = tryParse(cleanedDetailsRaw);

  // Step 3: final JSON base structure
  const finalJsonBase = {
    category: "Criminal Law",
    filename: input.filename,
    structure: input.structure,
    clauses: explainedClauses,
    caseDetails: cleanedDetails,
  };

  // Step 4: summary and important points
  const { summaryText, importantPoints } = await summarizeWithAdvice(finalJsonBase);

  return {
    ...finalJsonBase,
    summary: summaryText, // Add the full summary text
    important_points: importantPoints, // Add the extracted important points
  };
}