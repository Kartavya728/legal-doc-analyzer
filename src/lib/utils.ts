import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { GoogleGenerativeAI } from "@google/generative-ai";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

/**
 * Call the Gemini model with a prompt
 * @param prompt The prompt to send to Gemini
 * @returns The generated text response
 */
export async function callGemini(prompt: string): Promise<string> {
  try {
    // For safety, check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not defined in environment variables");
      return "Error: API key not configured";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Error generating response";
  }
}

/**
 * Stream responses from Gemini model
 * @param prompt The prompt to send to Gemini
 * @returns An async generator that yields text chunks
 */
export async function* streamGemini(prompt: string) {
  try {
    // For safety, check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not defined in environment variables");
      yield "Error: API key not configured";
      return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) yield chunkText;
    }
  } catch (error) {
    console.error("Error streaming from Gemini API:", error);
    yield "Error generating streaming response";
  }
}

// Function to generate UI models for related content with enhanced image search
export async function generateUIModels(content: string, description: string, documentType?: string) {
  try {
    // Add loading state indicator
    console.log('Generating UI models with image search...');
    
    // Call an API to generate UI models based on content and description
    const response = await fetch('/api/generate-ui-models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content, 
        description,
        documentType, // Add document type for better context
        enableImageSearch: true // Enable internet image search
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate UI models');
    }

    const data = await response.json();
    console.log('Successfully generated UI models with images');
    return data.models;
  } catch (error) {
    console.error('Error generating UI models:', error);
    return [];
  }
}

/**
 * Clean JSON string from model responses
 * @param input Any input that might contain JSON
 * @returns Cleaned and parsed JSON or the original input
 */
export function cleanJsonString(input: any): any {
  if (typeof input === "string") {
    try {
      const cleaned = input.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return input.trim();
    }
  } else if (Array.isArray(input)) {
    return input.map((el) => cleanJsonString(el));
  } else if (typeof input === "object" && input !== null) {
    const cleanedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      cleanedObj[key] = cleanJsonString(value);
    }
    return cleanedObj;
  }
  return input;
}

/**
 * Extract text from a PDF file
 * @param pdfBuffer PDF file buffer
 * @returns Extracted text
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from a DOCX file
 * @param docxBuffer DOCX file buffer
 * @returns Extracted text
 */
export async function extractTextFromDocx(docxBuffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return '';
  }
}
