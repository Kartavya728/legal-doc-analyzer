// src/lib/workflows/personal.ts
"use server";

import { callGemini, streamGemini, cleanJsonString } from "../utils";

/**
 * Extract clauses from personal legal document
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted clauses
 */
async function* extractClauses(chunk: string) {
  const prompt = `
    You are a legal expert specializing in personal legal documents. Extract all important clauses, statements, or legal points from this text.
    Return each clause on a new line. Focus on identifying distinct legal provisions, rights, obligations, or personal details.
    
    Text to analyze:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract personal identification information from ID cards and certificates
 * @param chunk Text chunk to analyze
 * @returns Generator yielding extracted identification information
 */
async function* extractPersonalIdentification(chunk: string) {
  const prompt = `
    You are a legal expert specializing in personal identification documents like ID cards (Aadhaar, PAN, Voter ID), passports, driver's licenses, and certificates.
    
    Extract ONLY the relevant identification information from this document text. Focus on:
    1. Personal details (name, date of birth, gender, etc.)
    2. Document numbers and identifiers
    3. Issuance and expiry dates
    4. Issuing authority information
    5. Address information if present
    
    IMPORTANT: DO NOT extract or generate:
    - Payment terms
    - Warranty information
    - Contract clauses
    - Terms and conditions
    - Or any other information not typically found in identification documents
    
    Separate each piece of information with a new line.
    
    Document text:
    ${chunk}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify a personal legal document clause into a subcategory
 * @param clause The clause to classify
 * @returns Generator yielding the classification
 */
async function* classifyPersonalLevel2(clause: string) {
  const prompt = `
    You are a legal expert specializing in personal legal documents. Classify this clause into ONE of these categories:
    
    1. Personal Identification
    2. Rights and Entitlements
    3. Obligations and Responsibilities
    4. Declarations and Attestations
    5. Beneficiary Designations
    6. Property Dispositions
    7. Healthcare Directives
    8. Guardianship Provisions
    9. Witness Statements
    10. Other
    
    Return ONLY the category name, nothing else.
    
    Clause to classify:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Classify the type of personal legal document
 * @param docText Full document text
 * @returns Generator yielding the document type
 */
async function* classifyPersonalDocument(docText: string) {
  const prompt = `
    You are a legal expert specializing in personal legal documents. Classify this document into ONE of these types:
    
    1. Will and Testament
    2. Power of Attorney
    3. Healthcare Directive
    4. Birth Certificate
    5. Marriage Certificate
    6. Divorce Decree
    7. Adoption Papers
    8. Personal Affidavit
    9. Name Change Document
    10. ID Card (Aadhaar, PAN, Voter ID, etc.)
    11. Passport
    12. Driver's License
    13. Other Personal Legal Document
    
    IMPORTANT INSTRUCTIONS:
    - If the document contains personal identification numbers, photos, or biometric information, carefully check if it's an ID card like Aadhaar, PAN, Voter ID, etc.
    - For ID cards, do NOT extract payment terms, warranty information, or other contract-related details that don't apply to identification documents.
    - Return ONLY the document type, nothing else.
    
    Document text:
    ${docText.substring(0, 3000)}... [truncated]
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Extract attributes from a personal legal document clause
 * @param clause The clause to analyze
 * @param docType The type of document (optional)
 * @returns Generator yielding extracted attributes
 */
async function* extractPersonalAttributes(clause: string, docType: string = "") {
  // Use a specialized prompt for ID documents
  if (docType.includes("ID Card") || docType.includes("Passport") || docType.includes("License") || docType.includes("Certificate")) {
    const prompt = `
      You are a legal expert specializing in personal identification documents. Extract key attributes from this information.
      
      Extract these attributes in JSON format:
      {
        "personalDetails": [list of personal details like name, gender, date of birth],
        "documentNumbers": [list of ID numbers and document identifiers],
        "dates": [list of issue dates, expiry dates, etc.],
        "authorities": [list of issuing authorities],
        "address": [list of address information if present]
      }
      
      IMPORTANT: DO NOT include or generate:
      - Payment terms
      - Warranty information
      - Contract clauses
      - Or any information not typically found in identification documents
      
      Information to analyze:
      ${clause}
    `;
    
    yield* streamGemini(prompt);
  } else {
    // Original prompt for other personal documents
    const prompt = `
      You are a legal expert specializing in personal legal documents. Extract key attributes from this clause.
      
      For each clause, provide:
      1. The individuals mentioned (if any)
      2. Any specific rights or entitlements
      3. Any obligations or responsibilities
      4. Any conditions or requirements
      5. Any dates or time periods
      
      Return the results in JSON format with these fields:
      {
        "individuals": [list of individuals mentioned],
        "rights": [list of rights or entitlements],
        "obligations": [list of obligations or responsibilities],
        "conditions": [list of conditions or requirements],
        "dates": [list of dates or time periods]
      }
      
      Clause to analyze:
      ${clause}
    `;
    
    yield* streamGemini(prompt);
  }
}

/**
 * Explain a personal legal document clause in plain language
 * @param clause The clause to explain
 * @returns Generator yielding the explanation
 */
async function* explainPersonalClause(clause: string) {
  const prompt = `
    You are a legal expert specializing in making personal legal documents understandable to non-lawyers.
    Explain this clause in plain, simple language that a high school student could understand.
    
    Focus on:
    1. What this clause means in practical terms
    2. What rights or obligations it creates
    3. How it affects the individual(s) involved
    
    Clause to explain:
    ${clause}
  `;
  
  yield* streamGemini(prompt);
}

/**
 * Generate a summary of personal legal document analysis
 * @param personalResults The analysis results
 * @param documentType The type of document
 * @returns Generator yielding the summary
 */
async function* generatePersonalSummary(personalResults: any[], documentType: string) {
  // Use a specialized prompt for ID documents
  if (documentType.includes("ID Card") || documentType.includes("Passport") || documentType.includes("License") || documentType.includes("Certificate")) {
    const prompt = `
      You are a legal expert specializing in personal identification documents. Generate a comprehensive summary of this ${documentType} based on the analyzed information.
      
      Focus on:
      1. The purpose and nature of the identification document
      2. The key personal details included
      3. The document numbers and identifiers
      4. The issuing authorities
      5. Any critical dates (issuance, expiry)
      
      IMPORTANT: DO NOT include or generate:
      - Payment terms
      - Warranty information
      - Contract clauses
      - Or any information not typically found in identification documents
      
      Analyzed information:
      ${JSON.stringify(personalResults, null, 2)}
      
      Provide a well-structured summary with clear headings and bullet points where appropriate.
    `;
    
    yield* streamGemini(prompt);
  } else {
    const prompt = `
      You are a legal expert specializing in personal legal documents. Generate a comprehensive summary of this ${documentType} based on the analyzed clauses.
      
      Focus on:
      1. The purpose and nature of the document
      2. The key individuals involved
      3. The main rights, entitlements, or declarations
      4. Any important obligations or responsibilities
      5. Any critical dates or deadlines
      
      Analyzed clauses:
      ${JSON.stringify(personalResults, null, 2)}
      
      Provide a well-structured summary with clear headings and bullet points where appropriate.
    `;
    
    yield* streamGemini(prompt);
  }
}

/**
 * Process a personal legal document
 * @param chunks Text chunks from the document
 * @param category Document category
 * @param docText Full document text
 * @returns Promise resolving to [summary, jsonData]
 */
export async function personalWorkflow(chunks: string[], category: string, docText: string): Promise<[string, any]> {
  console.log("Starting personal legal document workflow...");
  
  // First classify document type to determine appropriate extraction approach
  let docType = "";
  for await (const part of classifyPersonalDocument(docText)) {
    process.stdout.write(part); // Stream to terminal
    docType += part;
  }
  
  console.log(`\nDocument classified as: ${docType}`);
  
  // Extract all clauses from chunks - with document type-specific approach
  const allClauses: string[] = [];
  
  console.log("Extracting personal legal clauses in streaming mode...\n");
  for (const chunk of chunks) {
    let clauseText = "";
    // Use document-specific extraction for ID cards and certificates
    if (docType.includes("ID Card") || docType.includes("Passport") || docType.includes("License") || docType.includes("Certificate")) {
      for await (const partial of extractPersonalIdentification(chunk)) {
        process.stdout.write(partial); // Stream to terminal
        clauseText += partial;
      }
    } else {
      for await (const partial of extractClauses(chunk)) {
        process.stdout.write(partial); // Stream to terminal
        clauseText += partial;
      }
    }
    
    const clauses = clauseText.split("\n").filter(c => c.trim());
    allClauses.push(...clauses);
  }
  
  // Deduplicate clauses
  const uniqueClauses = Array.from(new Set(allClauses));
  
  // Classify clauses
  const personalResults = [];
  for (const clause of uniqueClauses) {
    let subCategory = "";
    for await (const part of classifyPersonalLevel2(clause)) {
      process.stdout.write(part); // Stream to terminal
      subCategory += part;
    }
    
    personalResults.push({
      clause,
      subCategory: subCategory.trim()
    });
  }
  
  // Extract attributes
  const personalAttributes = [];
  for (const clause of uniqueClauses) {
    let details = "";
    for await (const part of extractPersonalAttributes(clause, docType)) {
      process.stdout.write(part); // Stream to terminal
      details += part;
    }
    
    personalAttributes.push({
      clause,
      attributes: cleanJsonString(details)
    });
  }
  
  // Explain clauses
  const explainedClauses = [];
  for (const clause of uniqueClauses) {
    let explanation = "";
    for await (const part of explainPersonalClause(clause)) {
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
  for await (const part of generatePersonalSummary([...personalResults, ...personalAttributes, ...explainedClauses], docType)) {
    process.stdout.write(part); // Stream to terminal
    summary += part;
  }
  
  // Combine all data for JSON response
  const jsonData = {
    documentType: docType.trim(),
    clauses: uniqueClauses.length,
    classifications: personalResults,
    attributes: personalAttributes,
    explanations: explainedClauses
  };
  
  return [summary, jsonData];
}