// src/lib/langgraph.ts
"use server";

import { callGemini, streamGemini, cleanJsonString, extractTextFromPdf, extractTextFromDocx } from "./utils";
import { processDocument } from "./workflow";
import { contractWorkflow } from "./workflows/contracts";
import { litigationWorkflow } from "./workflows/litigation";
import { personalWorkflow } from "./workflows/personal";
import { governmentWorkflow } from "./workflows/government";
import { propertyWorkflow } from "./workflows/property";
import { regulatoryWorkflow } from "./workflows/regulatory";
import { corporateWorkflow } from "./workflows/corporate";
import { extractDatesWithContext, saveDatesToJson } from "./calendar";

/**
 * Interface for document analysis result
 */
export interface AnalysisResult {
  summary: string;
  jsonData: any;
  documentType: string;
  category: string;
  dates?: any[];
}

/**
 * Process a document file and generate analysis
 * @param file The document file to process
 * @returns Promise resolving to analysis result
 */
export async function processDocumentFile(file: File): Promise<AnalysisResult> {
  console.log("Starting document processing...");
  
  // Extract text from document based on file type
  let docText = "";
  const fileType = file.name.split(".").pop()?.toLowerCase();
  
  if (fileType === "pdf") {
    docText = await extractTextFromPdf(file);
  } else if (fileType === "docx" || fileType === "doc") {
    docText = await extractTextFromDocx(file);
  } else {
    // For text files or other formats, read as text
    docText = await file.text();
  }
  
  // Process the document text
  return await processDocumentText(docText);
}

/**
 * Process document text and generate analysis
 * @param docText The document text to process
 * @returns Promise resolving to analysis result
 */
export async function processDocumentText(docText: string): Promise<AnalysisResult> {
  console.log("Processing document text...");
  
  // Process document to get category, chunks, and dates
  const { category, chunks, dates } = await processDocument(docText);
  
  console.log(`Document classified as: ${category}`);
  console.log(`Document split into ${chunks.length} chunks`);
  
  // Process document based on category
  let summary = "";
  let jsonData = {};
  
  switch (category.toLowerCase()) {
    case "contracts":
      [summary, jsonData] = await contractWorkflow(chunks, category, docText);
      break;
    case "litigation":
      [summary, jsonData] = await litigationWorkflow(chunks, category, docText);
      break;
    case "personal":
      [summary, jsonData] = await personalWorkflow(chunks, category, docText);
      break;
    case "government":
      [summary, jsonData] = await governmentWorkflow(chunks, category, docText);
      break;
    case "property":
      [summary, jsonData] = await propertyWorkflow(chunks, category, docText);
      break;
    case "regulatory":
      [summary, jsonData] = await regulatoryWorkflow(chunks, category, docText);
      break;
    case "corporate":
      [summary, jsonData] = await corporateWorkflow(chunks, category, docText);
      break;
    default:
      // Fallback to contract workflow for unknown categories
      [summary, jsonData] = await contractWorkflow(chunks, category, docText);
  }
  
  // Extract dates with context if not already provided
  let documentDates = dates;
  if (!documentDates || documentDates.length === 0) {
    documentDates = await extractDatesWithContext(docText);
    await saveDatesToJson(documentDates);
  }
  
  // Determine document type from jsonData if available
  const documentType = jsonData.documentType || "Unknown Document";
  
  return {
    summary,
    jsonData,
    documentType,
    category,
    dates: documentDates
  };
}

/**
 * Generate suggested questions based on document analysis
 * @param analysisResult The document analysis result
 * @returns Promise resolving to array of suggested questions
 */
export async function generateSuggestedQuestions(analysisResult: AnalysisResult): Promise<string[]> {
  const { summary, jsonData, documentType, category } = analysisResult;
  
  const prompt = `
    You are a legal assistant helping a user understand a ${documentType} (category: ${category}).
    Based on the document analysis, generate 5 relevant questions that the user might want to ask about this document.
    
    Document summary:
    ${summary}
    
    Document analysis data:
    ${JSON.stringify(jsonData, null, 2)}
    
    Generate 5 specific, insightful questions that would help the user better understand this document.
    Return the questions as a JSON array of strings, with no additional text.
  `;
  
  const response = await callGemini(prompt);
  const cleanedResponse = cleanJsonString(response);
  
  try {
    const questions = JSON.parse(cleanedResponse);
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error("Error parsing suggested questions:", error);
    return [];
  }
}

/**
 * Generate a response to a user question about a document
 * @param question The user's question
 * @param analysisResult The document analysis result
 * @returns Generator yielding the response
 */
export async function* answerDocumentQuestion(question: string, analysisResult: AnalysisResult) {
  const { summary, jsonData, documentType, category } = analysisResult;
  
  const prompt = `
    You are a legal assistant helping a user understand a ${documentType} (category: ${category}).
    Answer the user's question based on the document analysis.
    
    Document summary:
    ${summary}
    
    Document analysis data:
    ${JSON.stringify(jsonData, null, 2)}
    
    User question: ${question}
    
    Provide a helpful, accurate response based solely on the information in the document analysis.
    If the answer cannot be determined from the available information, clearly state that.
  `;
  
  yield* streamGemini(prompt);
}