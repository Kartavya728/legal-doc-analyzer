import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Import category processors
import { processCriminalCase } from "./nodes/cat1";
import { processContracts } from "./nodes/cat2";
import { processCompliance } from "./nodes/cat3";
import { processGovernance } from "./nodes/cat4";
import { processPropertyDocs } from "./nodes/cat5";
import { processGovernment } from "./nodes/cat6";
import { processPersonalDocs } from "./nodes/cat7";

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

/** classify top-level category */
async function classifyLevel1(chunk: string): Promise<string> {
  const prompt = `
Classify this legal document into ONE of:
${categories.map((c) => "- " + c).join("\n")}
Text:
"""${chunk}"""
Return only category name.`;
  const result = await llm.invoke(prompt);
  return (result.content as string).trim();
}

/** generate short title */
async function generateTitle(text: string, filename: string): Promise<string> {
  const prompt = `
Generate a short, descriptive title (<=8 words) for this legal document.
Filename: ${filename}
Text: ${text.slice(0, 800)}
Return only the title.`;
  const result = await llm.invoke(prompt);
  return (result.content as string).trim();
}

/** Main LangGraph router */
export async function runLanggraph({
  text,
  filename,
  structure,
}: {
  text: string;
  filename: string;
  structure: any;
}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });
  const chunks = await splitter.splitText(text);

  // classify chunks
  const chunkCategories = await Promise.all(chunks.map(classifyLevel1));
  const category =
    chunkCategories.sort(
      (a, b) =>
        chunkCategories.filter((v) => v === a).length -
        chunkCategories.filter((v) => v === b).length
    ).pop() || null;

  let processed: any = {};

  switch (category) {
    case "Litigation & Court Documents":
      processed = await processCriminalCase({ text, filename, structure });
      break;
    case "Contracts & Agreements":
      processed = await processContracts({ text, filename, structure });
      break;
    case "Regulatory & Compliance":
      processed = await processCompliance({ text, filename, structure });
      break;
    case "Corporate Governance Documents":
      processed = await processGovernance({ text, filename, structure });
      break;
    case "Property & Real Estate":
      processed = await processPropertyDocs({ text, filename, structure });
      break;
    case "Government & Administrative":
      processed = await processGovernment({ text, filename, structure });
      break;
    case "Personal Legal Documents":
      processed = await processPersonalDocs({ text, filename, structure });
      break;
    default:
      processed = {};
  }

  const title = await generateTitle(text, filename);

  return {
    filename,
    content: text,
    category,
    title,
    metadata: processed,
    summary: processed?.summary || null,
    important_points: processed?.important_points || [],
  };
}
