// src/lib/workflows/regulatory.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from regulatory legal document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in regulatory documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct regulatory provisions, requirements, standards, or compliance obligations.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a regulatory document clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyRegulatoryLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in regulatory documents. Classify this clause into ONE of these categories:
    
    1. Compliance Requirements
    2. Reporting Obligations
    3. Prohibited Activities
    4. Enforcement Mechanisms
    5. Definitions and Scope
    6. Exemptions and Exceptions
    7. Implementation Timelines
    8. Penalties and Sanctions
    9. Regulatory Authority
    10. Industry Standards
    11. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify the type of regulatory document
 * @param docText Full document text
 * @returns Generator yielding the document type
 */
async function* classifyRegulatoryDocument(docText: string) {
  const prompt = `
    You are a legal expert specializing in regulatory documents. Classify this document into ONE of these types:
    
    1. Industry Regulation
    2. Environmental Regulation
    3. Financial Regulation
    4. Health and Safety Regulation
    5. Data Protection Regulation
    6. Consumer Protection Regulation
    7. Employment Regulation
    8. Transportation Regulation
    9. Energy Regulation
    10. Other Regulatory Document
    
    Return ONLY the document type, nothing else.
    
    Document text:
    ${docText.substring(0, 3000)}... [truncated]
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a regulatory document clause
 * @param clause The clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractRegulatoryAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in regulatory documents. Extract key attributes from this clause.
    
    For each clause, provide:
    1. The regulatory authority or agency mentioned (if any)
    2. Any specific compliance requirements
    3. Any deadlines or implementation dates
    4. Any penalties or consequences for non-compliance
    5. Any exemptions or exceptions
    
    Return the results in JSON format with these fields:
    {
      "authorities": [list of regulatory authorities or agencies mentioned],
      "requirements": [list of specific compliance requirements],
      "deadlines": [list of deadlines or implementation dates],
      "penalties": [list of penalties or consequences for non-compliance],
      "exemptions": [list of exemptions or exceptions]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a regulatory document clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainRegulatoryClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making regulatory documents understandable to businesses and individuals.
    Explain this clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this regulation requires or prohibits
    2. Who needs to comply with it
    3. What practical steps are needed for compliance
    4. What happens if someone doesn't comply
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of regulatory document analysis
 * @param regulatoryResults The analysis results
 * @param documentType The type of document
 * @returns Generator yielding the summary
 */
async function* generateRegulatorySummary(regulatoryResults: any[], documentType: string) {
  const prompt = `
    You are a legal expert specializing in regulatory documents. Generate a comprehensive summary of this ${documentType} based on the analyzed clauses.
    
    Focus on:
    1. The purpose and scope of the regulation
    2. The key compliance requirements
    3. Important deadlines or implementation dates
    4. Significant penalties or consequences for non-compliance
    5. Notable exemptions or exceptions
    6. Practical compliance considerations
    
    Analyzed clauses:
    ${JSON.stringify(regulatoryResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a regulatory document
 * @param chunks Text chunks from the document
 * @param category Document category
 * @param docText Full document text
 * @returns Promise resolving to [summary, jsonData]
 */
export async function regulatoryWorkflow(chunks: string[], category: string, docText: string): Promise<[string, any]> {
  console.log("Starting regulatory document workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting regulatory document clauses in streaming mode...\n");
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
  for await (const part of classifyRegulatoryDocument(docText)) {
    process.stdout.write(part); // Stream to terminal
    docType += part;
  }
  
  // Classify clauses
  const regulatoryResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyRegulatoryLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    regulatoryResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const regulatoryAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractRegulatoryAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    regulatoryAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainRegulatoryClause(clause)) {
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
  for await (const part of generateRegulatorySummary([...regulatoryResults, ...regulatoryAttributes, ...explainedClauses], docType)) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    documentType: docType.trim(),
    clauses: uniqueClauses.length,
    classifications: regulatoryResults,
    attributes: regulatoryAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}