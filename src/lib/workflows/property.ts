// src/lib/workflows/property.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from property legal document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in property documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct legal provisions, property descriptions, rights, obligations, or conditions.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a property document clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyPropertyLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in property documents. Classify this clause into ONE of these categories:
    
    1. Property Description
    2. Ownership Rights
    3. Easements and Restrictions
    4. Financial Terms
    5. Warranties and Representations
    6. Conditions and Contingencies
    7. Closing and Transfer Provisions
    8. Default and Remedies
    9. Maintenance and Repairs
    10. Governing Law
    11. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify the type of property document
 * @param docText Full document text
 * @returns Generator yielding the document type
 */
async function* classifyPropertyDocument(docText: string) {
  const prompt = `
    You are a legal expert specializing in property documents. Classify this document into ONE of these types:
    
    1. Deed
    2. Mortgage
    3. Lease Agreement
    4. Purchase Agreement
    5. Title Insurance Policy
    6. Property Tax Document
    7. Homeowners Association Document
    8. Easement Agreement
    9. Property Survey
    10. Other Property Document
    
    Return ONLY the document type, nothing else.
    
    Document text:
    ${docText.substring(0, 3000)}... [truncated]
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a property document clause
 * @param clause The clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractPropertyAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in property documents. Extract key attributes from this clause.
    
    For each clause, provide:
    1. The property details mentioned (if any)
    2. Any parties involved (buyers, sellers, landlords, tenants, etc.)
    3. Any financial terms or amounts
    4. Any dates or time periods
    5. Any conditions or contingencies
    
    Return the results in JSON format with these fields:
    {
      "property_details": [list of property details mentioned],
      "parties": [list of parties involved],
      "financial_terms": [list of financial terms or amounts],
      "dates": [list of dates or time periods],
      "conditions": [list of conditions or contingencies]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a property document clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainPropertyClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making property documents understandable to non-lawyers.
    Explain this clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this clause means in practical terms
    2. What rights or obligations it creates
    3. How it affects the property owner or other parties
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of property document analysis
 * @param propertyResults The analysis results
 * @param documentType The type of document
 * @returns Generator yielding the summary
 */
async function* generatePropertySummary(propertyResults: any[], documentType: string) {
  const prompt = `
    You are a legal expert specializing in property documents. Generate a comprehensive summary of this ${documentType} based on the analyzed clauses.
    
    Focus on:
    1. The property being described or transferred
    2. The key parties involved
    3. The main rights and obligations
    4. Any important financial terms
    5. Any critical dates or deadlines
    6. Any significant conditions or contingencies
    
    Analyzed clauses:
    ${JSON.stringify(propertyResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a property document
 * @param chunks Text chunks from the document
 * @param category Document category
 * @param docText Full document text
 * @returns Promise resolving to [summary, jsonData]
 */
export async function propertyWorkflow(chunks: string[], category: string, docText: string): Promise<[string, any]> {
  console.log("Starting property document workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting property document clauses in streaming mode...\n");
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
  for await (const part of classifyPropertyDocument(docText)) {
    process.stdout.write(part); // Stream to terminal
    docType += part;
  }
  
  // Classify clauses
  const propertyResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyPropertyLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    propertyResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const propertyAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractPropertyAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    propertyAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainPropertyClause(clause)) {
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
  for await (const part of generatePropertySummary([...propertyResults, ...propertyAttributes, ...explainedClauses], docType)) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    documentType: docType.trim(),
    clauses: uniqueClauses.length,
    classifications: propertyResults,
    attributes: propertyAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}