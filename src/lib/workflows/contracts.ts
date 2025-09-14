// src/lib/workflows/contracts.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract contract clauses from a chunk of text
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractContractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in contract analysis. Extract all contract clauses from this text.
    Return each clause on a new line. Focus on identifying distinct contractual provisions, obligations, rights, or terms.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a contract clause into a subcategory
 * @param clause The contract clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyContractLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in contract analysis. Classify this contract clause into ONE of these categories:
    
    1. Payment Terms
    2. Termination
    3. Confidentiality
    4. Intellectual Property
    5. Liability
    6. Warranties
    7. Force Majeure
    8. Dispute Resolution
    9. Assignment
    10. Governing Law
    11. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a contract clause
 * @param clause The contract clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractContractAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in contract analysis. Extract key attributes from this contract clause.
    
    For each clause, provide:
    1. The parties involved (if mentioned)
    2. Any specific obligations or rights
    3. Any conditions or triggers
    4. Any deadlines or time periods
    5. Any monetary values or percentages
    
    Return the results in JSON format with these fields:
    {
      "parties": [list of parties involved],
      "obligations": [list of obligations],
      "conditions": [list of conditions],
      "timeframes": [list of deadlines or periods],
      "values": [list of monetary values or percentages]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a contract clause in plain language
 * @param clause The contract clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainContractClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making contracts understandable to non-lawyers.
    Explain this contract clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this clause means in practical terms
    2. What obligations it creates
    3. What risks or benefits it presents
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of contract analysis
 * @param contractResults The contract analysis results
 * @returns Generator yielding the summary
 */
async function* generateContractSummary(contractResults: any[]) {
  const prompt = `
    You are a legal expert specializing in contract analysis. Generate a comprehensive summary of this contract based on the analyzed clauses.
    
    Focus on:
    1. The overall purpose and structure of the contract
    2. Key rights and obligations of each party
    3. Important deadlines or milestones
    4. Potential risks or areas of concern
    5. Recommendations for the reader
    
    Analyzed clauses:
    ${JSON.stringify(contractResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a contract document
 * @param chunks Text chunks from the document
 * @returns Promise resolving to [summary, jsonData]
 */
export async function contractWorkflow(chunks: string[]): Promise<[string, any]> {
  console.log("Starting contract workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting contract clauses in streaming mode...\n");
  for (const chunk of chunks) {
    let clauseText = "";
    for await (const partial of extractContractClauses(chunk)) {
      process.stdout.write(partial); // Stream to terminal
      clauseText += partial;
    }
    
    const clauses = clauseText.split("\n").filter(c => c.trim());
    allClauses.push(...clauses);
  }
  
  // Deduplicate clauses
  const uniqueClauses = Array.from(new Set(allClauses));
  
  // Classify clauses
  const contractResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyContractLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    contractResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const contractAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractContractAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    contractAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainContractClause(clause)) {
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
  for await (const part of generateContractSummary([...contractResults, ...contractAttributes, ...explainedClauses])) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    clauses: uniqueClauses.length,
    classifications: contractResults,
    attributes: contractAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}