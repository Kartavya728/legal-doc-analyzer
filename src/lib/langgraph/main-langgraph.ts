import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { processCriminalCase } from "./nodes/cat1"; // Assuming correct relative path

// ✅ Initialize Gemini LLM
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0,
});

const categories = [
  "Contracts & Agreements",
  "Litigation & Court Documents",
  "Regulatory & Compliance",
  "Corporate Governance Documents",
  "Property & Real Estate",
  "Government & Administrative",
  "Personal Legal Documents",
];

/**
 * Classify a chunk of text into level-1 legal category
 */
async function classifyLevel1(chunkText: string): Promise<string> {
  const prompt = `
You are a legal assistant. Classify the following document into one of these categories:
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Document:
${chunkText}

Return only the category name.`;

  const result = await llm.invoke(prompt);
  return (result.content as string).trim();
}

/**
 * Main LangGraph pipeline
 */
export async function runLangGraph(input: {
  engText: string;
  structure: any;
  filename: string;
}) {
  // Step 1: Split text into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });
  const chunks = await splitter.splitText(input.engText);

  // Step 2: Classify each chunk
  const chunkCategories = await Promise.all(chunks.map(classifyLevel1));

  // Step 3: Majority vote
  const category =
    chunkCategories.sort(
      (a, b) =>
        chunkCategories.filter((v) => v === a).length -
        chunkCategories.filter((v) => v === b).length
    ).pop() || null;

  let extracted: any = null;

  // Step 4: Route to cat1 if litigation/criminal
  if (category === "Litigation & Court Documents") {
    extracted = await processCriminalCase({
      text: input.engText,
      structure: input.structure,
      filename: input.filename,
    });
  }

  return {
    filename: input.filename,
    text: input.engText,
    structure: input.structure,
    category,
    ...extracted,
  };
}
