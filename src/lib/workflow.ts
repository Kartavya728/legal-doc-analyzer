// src/lib/workflow.ts
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractFutureDatesWithContext, saveDatesToJson, addEventsToCalendar } from "./calendar";
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";
import { callGemini } from "./utils";

// Import workflow functions
import { contractWorkflow } from "./workflows/contracts";
import { personalWorkflow } from "./workflows/personal";
import { propertyWorkflow } from "./workflows/property";
import { litigationWorkflow } from "./workflows/litigation";
import { corporateWorkflow } from "./workflows/corporate";
import { regulatoryWorkflow } from "./workflows/regulatory";
import { governmentWorkflow } from "./workflows/government";

/**
 * Main function to process a document
 * @param docText The text content of the document
 * @returns Analysis results
 */
export async function processDocument(docText: string) {
  // Extract future dates for calendar integration
  const futureDates = extractFutureDatesWithContext(docText);
  
  if (futureDates && futureDates.length > 0) {
    const jsonFile = await saveDatesToJson(futureDates, "deadlines.json");
    console.log(`Extracted ${futureDates.length} future dates saved to ${jsonFile}`);
    
    await addEventsToCalendar(futureDates, "primary");
  } else {
    console.log("No future dates found in this document.");
  }

  // Split document into chunks for processing
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 150
  });
  
  const chunks = await textSplitter.splitText(docText);

  // Level 1 classification
  const chunkCategories = await Promise.all(chunks.map(chunk => classifyLevel1(chunk)));
  
  // Find most frequent category
  const categoryCounts = chunkCategories.reduce((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const level1Category = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  console.log("Level 1 Category:", level1Category);

  // Process document based on category
  let documentSummary, jsonData;
  
  switch (level1Category) {
    case "Property & Real Estate":
      [documentSummary, jsonData] = await propertyWorkflow(chunks, level1Category);
      break;
    case "Regulatory & Compliance":
      [documentSummary, jsonData] = await regulatoryWorkflow(chunks, level1Category);
      break;
    case "Personal Legal Documents":
      [documentSummary, jsonData] = await personalWorkflow(chunks, level1Category, docText);
      break;
    case "Litigation & Court Documents":
      [documentSummary, jsonData] = await litigationWorkflow(chunks, level1Category, docText);
      break;
    case "Corporate Governance Documents":
      [documentSummary, jsonData] = await corporateWorkflow(chunks, level1Category, docText);
      break;
    case "Contracts & Agreements":
      [documentSummary, jsonData] = await contractWorkflow(chunks, level1Category, docText);
      break;
    case "Government & Administrative":
      [documentSummary, jsonData] = await governmentWorkflow(chunks, level1Category, docText);
      break;
    default:
      documentSummary = "Document type not recognized";
      jsonData = {};
  }

  return {
    category: level1Category,
    summary: documentSummary,
    data: jsonData,
    futureDates
  };
}

/**
 * Classifies a chunk of text into a legal document category
 * @param chunkText Text chunk to classify
 * @returns Category classification
 */
async function classifyLevel1(chunkText: string): Promise<string> {
  const prompt = `
    You are an expert legal document classifier with deep knowledge of Indian and international legal systems.  

    🎯 TASK: Classify this document into ONE category from the list below.  

    📂 CATEGORIES:  
    1. Contracts & Agreements  
    2. Litigation & Court Documents  
    3. Regulatory & Compliance  
    4. Corporate Governance Documents  
    5. Property & Real Estate  
    6. Government & Administrative  
    7. Personal Legal Documents  
    8. NON-LEGAL DOCUMENT  
    9. PSEUDO-LEGAL DOCUMENT  

    🔍 CLASSIFICATION RULES (STRICT FILTERING):  

    ### STEP 1 - VALIDITY CHECK (Most Important)  
    Decide FIRST if the text is a real legal document or not:  

    *NON-LEGAL DOCUMENT →*  
    - Narrative / Fiction: novels, stories, diaries, letters describing events.  
    - Informational / Educational: blog posts, news, academic articles, lecture notes, study guides.  
    - Technical / Business: software code, marketing content, product descriptions, financial reports.  
    - Random / Gibberish: incoherent, fragmented, or irrelevant content.  
    - Legal Commentary: summaries, explanations, or discussions about law but not actual binding documents.  

    *PSEUDO-LEGAL DOCUMENT →*  
    - Fake or template-like with placeholders ([INSERT NAME], XXXX, <party A>).  
    - Documents explicitly marked as "Sample", "Template", "Example".  
    - Clearly fabricated or incomplete drafts that cannot be binding.  

    ⚠ If either case applies, STOP and return only *NON-LEGAL DOCUMENT* or *PSEUDO-LEGAL DOCUMENT* .

    ---

    ### STEP 2 - LEGAL DOCUMENT CLASSIFICATION  
    (Only if it passes Step 1 as a real legal document)  

    Apply priority order:  
    1. *Property & Real Estate* → deeds, leases, sale agreements, mortgage docs.  
    2. *Personal Legal Documents* → ID cards, wills, birth/marriage certificates, affidavits.  
    3. *Government & Administrative* → official notices, government orders, public gazettes.  
    4. *Regulatory & Compliance* → licenses, permits, compliance filings, environmental/industry approvals.  
    5. *Corporate Governance Documents* → board resolutions, shareholder agreements, bylaws, MOA/AOA.  
    6. *Litigation & Court Documents* → petitions, judgments, court orders, arbitration filings.  
    7. *Contracts & Agreements* → commercial contracts not covered above (service agreements, NDAs, MoUs).  

    ---

    🎯 DECISION PRIORITY ORDER:  
    1. First filter: NON-LEGAL DOCUMENT vs PSEUDO-LEGAL DOCUMENT.  
    2. If neither, apply Step 2 and assign the most specific category by the rules above.  

    Document Text: ${chunkText}  

    INSTRUCTIONS:  
    - Analyze the *purpose and function*, not just keywords.  
    - Be strict: if it only talks about law but is not a binding legal document, classify as *NON-LEGAL DOCUMENT*.  
    - Return ONLY the category name, nothing else.  
  `;
  
  return await callGemini(prompt);
}