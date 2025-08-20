import { HfInference } from '@huggingface/inference';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Environment Variable Check (remains the same)
const hfToken = process.env.HUGGINGFACE_ACCESS_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!hfToken) {
  throw new Error("FATAL: HUGGINGFACE_ACCESS_TOKEN is not defined in your .env.local file.");
}
if (!geminiApiKey) {
  throw new Error("FATAL: GEMINI_API_KEY is not defined in your .env.local file.");
}

// Initialize clients (remains the same)
const hf = new HfInference(hfToken);
const geminiModel = new ChatGoogleGenerativeAI({
  apiKey: geminiApiKey,
  model: "gemini-pro",
  temperature: 0.3,
});

// The data structure our API will return
export interface TestResult {
  extractedText: string;
  hfSummary: string;
  geminiSummary: string;
}

/**
 * Extracts text from an image buffer using a Hugging Face OCR model.
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const model = "microsoft/trocr-base-handwritten";

  // --- FIX #1: Use the underlying .buffer property for type compatibility ---
  const imageBlob = new Blob([imageBuffer.buffer]);

  const result = await hf.imageToText({
    model,
    data: imageBlob,
  });

  // --- FIX #2: Handle potential 'undefined' result with a fallback ---
  return result.generated_text ?? '';
}

/**
 * Gets a one-line summary from Hugging Face.
 */
export async function getOneLineSummaryHF(text: string): Promise<string> {
  const model = "facebook/bart-large-cnn";
  const result = await hf.summarization({
    model,
    inputs: text.substring(0, 1024),
    parameters: { max_length: 60 }
  });

  // --- FIX #2: Handle potential 'undefined' result with a fallback ---
  return result.summary_text ?? '';
}

/**
 * Gets a one-line summary from Google Gemini.
 */
export async function getOneLineSummaryGemini(text: string): Promise<string> {
  const prompt = `Provide a single, concise one-line summary of the following text: \n\n"${text.substring(0, 4000)}"`;
  const result = await geminiModel.invoke(prompt);
  
  // --- FIX #2: Handle potential 'undefined' result with a fallback ---
  return (result.content as string) ?? '';
}