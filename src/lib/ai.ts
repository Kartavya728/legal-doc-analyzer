import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("FATAL: GEMINI_API_KEY is not defined in your .env.local file.");
}

const geminiModel = new ChatGoogleGenerativeAI({
  apiKey: geminiApiKey,
  model: "gemini-1.5-pro",
  temperature: 0.4,
});

/**
 * Takes raw text from a legal document and generates a structured
 * analysis formatted in Markdown.
 * @param text The raw text of the document.
 * @returns A promise that resolves to a single Markdown string.
 */
export async function generateMarkdownAnalysis(text: string): Promise<string> {
  const prompt = `
    You are an expert legal analyst AI. Your task is to analyze the following document text and generate a clear, concise, and well-structured report formatted exclusively in Markdown.

    The report must contain the following sections:
    1.  A "Document Summary" section with a level 2 heading (##).
    2.  A "Key Clauses & Potential Risks" section with a level 2 heading (##). Under this heading, use a bulleted list (-) to identify at least 3-5 important clauses, terms, or risks. For each item, bold the key term (e.g., **Indemnification**) and then provide a simple, one-sentence explanation.
    3.  A "Recommendations" section with a level 2 heading (##). Provide a short, actionable recommendation for the user (e.g., "Consult a lawyer before signing," "Pay close attention to the termination clause," etc.).

    Here is the document text:
    ---
    ${text.substring(0, 8000)} 
    ---
  `;

  const result = await geminiModel.invoke(prompt);
  return (result.content as string) ?? "Analysis could not be generated.";
}