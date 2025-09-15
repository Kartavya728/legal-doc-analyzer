// src/lib/workflows/corporate.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from corporate legal document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in corporate documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct legal provisions, corporate governance rules, business terms, or obligations.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a corporate document clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyCorporateLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in corporate documents. Classify this clause into ONE of these categories:
    
    1. Corporate Governance
    2. Financial Provisions
    3. Shareholder Rights
    4. Board Powers and Duties
    5. Officer Responsibilities
    6. Indemnification
    7. Merger and Acquisition Terms
    8. Intellectual Property
    9. Confidentiality
    10. Dispute Resolution
    11. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify the type of corporate document
 * @param docText Full document text
 * @returns Generator yielding the document type
 */
async function* classifyCorporateDocument(docText: string) {
  const prompt = `
    You are a legal expert specializing in corporate documents. Classify this document into ONE of these types:
    
    1. Articles of Incorporation
    2. Bylaws
    3. Shareholder Agreement
    4. Board Resolution
    5. Annual Report
    6. Merger Agreement
    7. Asset Purchase Agreement
    8. Stock Purchase Agreement
    9. Employment Agreement
    10. Other Corporate Document
    
    Return ONLY the document type, nothing else.
    
    Document text:
    ${docText.substring(0, 3000)}... [truncated]
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a corporate document clause
 * @param clause The clause to analyze
 * @returns Generator yielding extracted attributes
 */
async function* extractCorporateAttributes(clause: string) {
  const prompt = `
    You are a legal expert specializing in corporate documents. Extract key attributes from this clause.
    
    For each clause, provide:
    1. The parties or entities mentioned (if any)
    2. Any specific rights or powers granted
    3. Any obligations or restrictions imposed
    4. Any financial terms or conditions
    5. Any important dates or deadlines
    
    Return the results in JSON format with these fields:
    {
      "entities": [list of parties or entities mentioned],
      "rights": [list of specific rights or powers granted],
      "obligations": [list of obligations or restrictions imposed],
      "financial_terms": [list of financial terms or conditions],
      "dates": [list of important dates or deadlines]
    }
    
    Clause to analyze:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Explain a corporate document clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainCorporateClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making corporate documents understandable to business professionals without legal training.
    Explain this clause in plain, simple language that a business professional could understand.
    
    Focus on:
    1. What this clause means in practical business terms
    2. What rights or obligations it creates
    3. How it affects the company, shareholders, or other stakeholders
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of corporate document analysis
 * @param corporateResults The analysis results
 * @param documentType The type of document
 * @returns Generator yielding the summary
 */
async function* generateCorporateSummary(corporateResults: any[], documentType: string) {
  const prompt = `
    You are a legal expert specializing in corporate documents. Generate a comprehensive summary of this ${documentType} based on the analyzed clauses.
    
    Focus on:
    1. The purpose and nature of the document
    2. The key corporate entities or stakeholders involved
    3. The main rights, powers, or authorities established
    4. Any important obligations or restrictions
    5. Any significant financial terms or conditions
    6. Any critical dates or deadlines
    
    Analyzed clauses:
    ${JSON.stringify(corporateResults, null, 2)}
    
    Provide a well-structured summary with clear headings and bullet points where appropriate.
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Process a corporate document
 * @param chunks Text chunks from the document

 * @param docText Full document text
 * @returns Promise resolving to [summary, jsonData]
 */
export async function corporateWorkflow(chunks: string[], docText: string): Promise<[string, any]> {
  console.log("Starting corporate document workflow...");
  
  // Extract all clauses from chunks
  const allClauses: string[] = [];
  
  console.log("Extracting corporate document clauses in streaming mode...\n");
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
  for await (const part of classifyCorporateDocument(docText)) {
    process.stdout.write(part); // Stream to terminal
    docType += part;
  }
  
  // Classify clauses
  const corporateResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyCorporateLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    corporateResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const corporateAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractCorporateAttributes(clause)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    corporateAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainCorporateClause(clause)) {
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
  for await (const part of generateCorporateSummary([...corporateResults, ...corporateAttributes, ...explainedClauses], docType)) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    documentType: docType.trim(),
    clauses: uniqueClauses.length,
    classifications: corporateResults,
    attributes: corporateAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}