// src/lib/workflows/government.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from government legal document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in government documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct legal provisions, requirements, regulations, or official statements.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a government document clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyGovernmentLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in government documents. Classify this clause into ONE of these categories:
    
    1. Regulatory Requirements
    2. Compliance Standards
    3. Enforcement Provisions
    4. Definitions and Interpretations
    5. Procedural Requirements
    6. Rights and Protections
    7. Obligations and Duties
    8. Penalties and Sanctions
    9. Exemptions and Exceptions
    10. Administrative Provisions
    11. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify the type of government document
 * @param docText Full document text
 * @returns Generator yielding the document type
 */
async function* classifyGovernmentDocument(docText: string) {
  const prompt = `
    You are a legal expert specializing in government documents. Classify this document into ONE of these types:
    
    1. Legislation/Statute
    2. Regulation
    3. Executive Order
    4. Policy Directive
    5. Guidance Document
    6. Official Notice
    7. Administrative Decision
    8. Government Report
    9. Official Form
    10. Other Government Document
    
    Return ONLY the document type, nothing else.
    
    Document text:
    ${docText.substring(0, 3000)}... [truncated]
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a government document clause
 * @param clause The clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractGovernmentAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in government documents. Extract key attributes from this clause.
    
    For each clause, provide:
    1. The agencies or authorities mentioned (if any)
    2. Any specific requirements or standards
    3. Any compliance deadlines or timeframes
    4. Any penalties or enforcement mechanisms
    5. Any exemptions or special provisions
    
    Return the results in JSON format with these fields:
    {
      "agencies": [list of agencies or authorities mentioned],
      "requirements": [list of specific requirements or standards],
      "timeframes": [list of compliance deadlines or timeframes],
      "enforcement": [list of penalties or enforcement mechanisms],
      "exemptions": [list of exemptions or special provisions]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a government document clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainGovernmentClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making government documents understandable to the general public.
    Explain this clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this clause requires or prohibits
    2. Who it applies to
    3. What practical impact it has
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of government document analysis
 * @param governmentResults The analysis results
 * @param documentType The type of document
 * @returns Generator yielding the summary
 */
async function* generateGovernmentSummary(governmentResults: any[], documentType: string) {
  const prompt = `
    You are a legal expert specializing in government documents. Generate a comprehensive summary of this ${documentType} based on the analyzed clauses.
    
    Focus on:
    1. The purpose and scope of the document
    2. The key requirements or provisions
    3. Important compliance deadlines or timeframes
    4. Significant penalties or enforcement mechanisms
    5. Notable exemptions or special provisions
    
    Analyzed clauses:
    ${JSON.stringify(governmentResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a government document
 * @param chunks Text chunks from the document
 * @param category Document category
 * @param docText Full document text
 * @returns Promise resolving to [summary, jsonData]
 */
export async function governmentWorkflow(chunks: string[], category: string, docText: string): Promise<[string, any]> {
  console.log("Starting government document workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting government document clauses in streaming mode...\n");
  for (const chunk of chunks) {
    let clauseText = "";
    for await (const partial of extractClauses(chunk)) {
      process.stdout.write(partial); // Stream to terminal
      clauseText += partial;
    }
    
    const clauses = clauseText.split("\n").filter(c => c.trim());
    allClauses.push(...clauses);
  }
  
  // Deduplicate clauses
  const uniqueClauses = Array.from(new Set(allClauses));
  
  // Classify document type
  let docType = "";
  for await (const part of classifyGovernmentDocument(docText)) {
    process.stdout.write(part); // Stream to terminal
    docType += part;
  }
  
  // Classify clauses
  const governmentResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyGovernmentLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    governmentResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const governmentAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractGovernmentAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    governmentAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainGovernmentClause(clause)) {
      process.stdout.write(part); // Stream to terminal
      explanation += part;
    }
    
    explainedClauses.push({
      clause,
      explanation: explanation.trim()
    });
  }
  
  // Generate summary
  let summary = "";
  for await (const part of generateGovernmentSummary([...governmentResults, ...governmentAttributes, ...explainedClauses], docType)) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    documentType: docType.trim(),
    clauses: uniqueClauses.length,
    classifications: governmentResults,
    attributes: governmentAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}