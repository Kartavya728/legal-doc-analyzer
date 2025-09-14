// src/lib/workflows/litigation.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from litigation document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in litigation documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct legal arguments, facts, rulings, or procedural elements.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a litigation clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyCriminalLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in litigation. Classify this legal clause into ONE of these categories:
    
    1. Procedural History
    2. Facts of the Case
    3. Legal Issues
    4. Arguments
    5. Evidence
    6. Rulings
    7. Orders
    8. Remedies
    9. Jurisdiction
    10. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a litigation clause
 * @param clause The clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractCriminalAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in litigation. Extract key attributes from this legal clause.
    
    For each clause, provide:
    1. The parties involved (if mentioned)
    2. Any legal principles or statutes cited
    3. Any precedents or case law referenced
    4. Any dates or deadlines mentioned
    5. Any rulings or decisions made
    
    Return the results in JSON format with these fields:
    {
      "parties": [list of parties involved],
      "legalPrinciples": [list of legal principles or statutes],
      "precedents": [list of precedents or case law],
      "dates": [list of dates or deadlines],
      "rulings": [list of rulings or decisions]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a litigation clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainLitigationClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making litigation documents understandable to non-lawyers.
    Explain this legal clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this clause means in practical terms
    2. What legal implications it has
    3. How it affects the case or the parties involved
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of litigation analysis
 * @param litigationResults The litigation analysis results
 * @returns Generator yielding the summary
 */
async function* generateLitigationSummary(litigationResults: any[]) {
  const prompt = `
    You are a legal expert specializing in litigation. Generate a comprehensive summary of this litigation document based on the analyzed clauses.
    
    Focus on:
    1. The nature and background of the case
    2. The key legal issues and arguments
    3. The evidence presented
    4. The rulings or decisions made
    5. The implications for the parties involved
    
    Analyzed clauses:
    ${JSON.stringify(litigationResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a litigation document
 * @param chunks Text chunks from the document
 * @returns Promise resolving to [summary, jsonData]
 */
export async function litigationWorkflow(chunks: string[]): Promise<[string, any]> {
  console.log("Starting litigation workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting clauses in streaming mode...\n");
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
  
  // Classify clauses
  const litigationResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyCriminalLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    litigationResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const litigationAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractCriminalAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    litigationAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainLitigationClause(clause)) {
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
  for await (const part of generateLitigationSummary([...litigationResults, ...litigationAttributes, ...explainedClauses])) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    clauses: uniqueClauses.length,
    classifications: litigationResults,
    attributes: litigationAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}