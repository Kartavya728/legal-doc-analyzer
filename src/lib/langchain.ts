import { HfInference } from '@huggingface/inference';

// --- Environment Variable Check ---
const hfToken = process.env.HUGGINGFACE_ACCESS_TOKEN;
if (!hfToken) {
  throw new Error("FATAL: HUGGINGFACE_ACCESS_TOKEN is not defined in your .env.local file.");
}

// Initialize the Hugging Face client
const hf = new HfInference(hfToken);

// --- Define the Output Structure ---
// The final output format remains the same, so no frontend changes are needed.
export type AnalysisResult = {
  summary: string;
  risks: {
    term: string;
    explanation: string;
  }[];
};

/**
 * STEP 1: Summarizes the document using a dedicated summarization model.
 */
async function summarizeWithHuggingFace(text: string): Promise<string> {
  const model = "facebook/bart-large-cnn"; // A popular and effective summarization model
  console.log("HF Step 1: Summarizing text...");

  const result = await hf.summarization({
    model,
    inputs: text,
    parameters: {
      min_length: 50,
      max_length: 250,
    }
  });

  return result.summary_text ?? "A summary could not be generated.";
}

/**
 * STEP 2: Identifies risks using a text-generation model and a specific prompt format.
 */
async function identifyRisksWithHuggingFace(text: string): Promise<{ term: string, explanation: string }[]> {
  // Use a powerful instruction-tuned model for better prompt-following
  const model = "mistralai/Mistral-7B-Instruct-v0.2";
  console.log("HF Step 2: Identifying risks...");

  const prompt = `
    Analyze the following legal document text. Your task is to identify 3 to 5 of the most critical legal terms, clauses, or potential risks for a non-expert.

    For each risk you identify, you MUST use the following format exactly:
    TERM: A simple, one-sentence explanation of what this term means or why it's a risk.

    Put each item on a new line. Do not add any other text, introductory sentences, or conclusions.

    DOCUMENT TEXT:
    ---
    ${text}
    ---
  `;

  const response = await hf.textGeneration({
    model,
    inputs: prompt,
    parameters: {
      max_new_tokens: 300,
      temperature: 0.3,
      repetition_penalty: 1.2,
    }
  });

  const generatedText = response.generated_text ?? '';
  
  // --- STEP 3: Parse the semi-structured text into a JSON object ---
  console.log("HF Step 3: Parsing risk analysis...");
  const risks: { term: string, explanation: string }[] = [];
  const lines = generatedText.split('\n');

  for (const line of lines) {
    if (line.includes(':')) {
      const parts = line.split(':');
      const term = parts[0].trim();
      const explanation = parts.slice(1).join(':').trim();

      // Basic validation to ensure we have meaningful content
      if (term && explanation) {
        risks.push({ term, explanation });
      }
    }
  }

  return risks;
}


/**
 * Main orchestrator function to perform the full analysis using Hugging Face.
 * This is the only function you'll need to call from your API route.
 */
export async function analyzeDocumentWithHuggingFace(documentText: string): Promise<AnalysisResult> {
  console.log("Analyzing with Hugging Face workflow...");

  try {
    // Truncate the input text to a reasonable length to avoid exceeding model limits
    const truncatedText = documentText.substring(0, 20000);

    // Run both tasks in parallel for better performance
    const [summary, risks] = await Promise.all([
      summarizeWithHuggingFace(truncatedText),
      identifyRisksWithHuggingFace(truncatedText),
    ]);

    return {
      summary,
      risks,
    };
  } catch (error: any) {
    console.error("Error during Hugging Face analysis:", error);
    // Return a structured error response
    return {
      summary: "An error occurred during the analysis.",
      risks: [{ term: "Error", explanation: error.message || "Unknown error" }],
    };
  }
}