// src/lib/langgraph/main-langgraph.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { generateAdaptiveUI } from "../utils/enhanced-ui-generator";
import { supabase } from "../supabase/client";
import { v4 as uuidv4 } from "uuid";

// Import workflows
import { contractWorkflow } from "../workflows/contracts";
import { litigationWorkflow } from "../workflows/litigation";
import { corporateWorkflow } from "../workflows/corporate";
import { governmentWorkflow } from "../workflows/government";
import { propertyWorkflow } from "../workflows/property";
import { personalWorkflow } from "../workflows/personal";
import { regulatoryWorkflow } from "../workflows/regulatory";

// ---------- LLM CONFIG ----------
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.15,
  streaming: false,
});

// Streaming LLM instance
const streamingLlm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.15,
  streaming: true,
});

// ---------- STATE ----------
interface ProcessingState {
  text: string;
  filename: string;
  userId: string;
  category?: string;
  workflowOutput?: { summary: string; jsonData: any };
  uiStructure?: any;
}

// ---------- MEMORY ----------
async function saveMemoryToDB(
  userId: string,
  docId: string,
  step: string,
  data: any
) {
  try {
    const { error } = await supabase.from("document_memories").insert({
      id: uuidv4(),
      user_id: userId,
      document_id: docId,
      step,
      data,
      created_at: new Date().toISOString(),
    });
    if (error) console.error(`❌ Memory save failed at step ${step}:`, error);
  } catch (err) {
    console.error("❌ Memory persistence error:", err);
  }
}

// ---------- CATEGORY CLASSIFICATION ----------
async function classifyCategory(state: ProcessingState): Promise<ProcessingState> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 300,
  });

  const chunks = await splitter.splitText(state.text);
  const sampleText = chunks.slice(0, 3).join("\n");

  const prompt = `
You are a senior legal analyst.  
Classify the document into ONE category:

1. Contracts & Agreements
2. Litigation & Court Documents
3. Regulatory & Compliance
4. Corporate Governance Documents
5. Property & Real Estate
6. Government & Administrative
7. Personal Legal Documents

Excerpt:
"""${sampleText}"""

Return strict JSON:
{ "category": "exact category name" }
`;

  const result = await llm.invoke(prompt);

  let category = "Contracts & Agreements"; // fallback
  try {
    const raw = (result.content as string).trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    category = parsed.category || category;
  } catch (e) {
    console.warn("⚠️ Classification fallback:", e);
  }

  await saveMemoryToDB(state.userId, state.filename, "classification", { category });

  return { ...state, category };
}

// ---------- WORKFLOW ROUTER ----------
async function runWorkflow(state: ProcessingState): Promise<ProcessingState> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 300,
  });
  const chunks = await splitter.splitText(state.text);

  let summary = "No summary";
  let jsonData: any = {};

  switch (state.category) {
    case "Contracts & Agreements":
      [summary, jsonData] = await contractWorkflow(chunks);
      break;
    case "Litigation & Court Documents":
      [summary, jsonData] = await litigationWorkflow(chunks);
      break;
    case "Corporate Governance Documents":
      [summary, jsonData] = await corporateWorkflow(chunks, state.category!, state.text);
      break;
    case "Government & Administrative":
      [summary, jsonData] = await governmentWorkflow(chunks, state.category!, state.text);
      break;
    case "Property & Real Estate":
      [summary, jsonData] = await propertyWorkflow(chunks, state.category!, state.text);
      break;
    case "Personal Legal Documents":
      [summary, jsonData] = await personalWorkflow(chunks, state.category!, state.text);
      break;
    case "Regulatory & Compliance":
      [summary, jsonData] = await regulatoryWorkflow(chunks, state.category!, state.text);
      break;
    default:
      summary = "No specific workflow. Fallback summary only.";
      jsonData = {};
  }

  await saveMemoryToDB(state.userId, state.filename, "workflow", { summary, jsonData });

  return { ...state, workflowOutput: { summary, jsonData } };
}

// ---------- FINAL PIPELINE ----------
export async function runEnhancedLanggraphWorkflow(
  userId: string,
  filename: string,
  text: string
) {
  let state: ProcessingState = { text, filename, userId };

  // Step 1: Classify
  state = await classifyCategory(state);

  // Step 2: Run Category-Specific Workflow
  state = await runWorkflow(state);

  // Step 3: Generate Adaptive UI
  if (!state.workflowOutput) {
    state.workflowOutput = { summary: "No summary", jsonData: {} };
  }

  const ui = await generateAdaptiveUI(state.workflowOutput);
  state.uiStructure = ui;

  await saveMemoryToDB(state.userId, state.filename, "ui-generation", ui);

  return state;
}

// ---------- STREAMING PIPELINE ----------
export async function streamEnhancedLanggraphWorkflow(
  userId: string,
  filename: string,
  text: string
) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const encoder = new TextEncoder();

        // Step 1: Classification
        controller.enqueue(encoder.encode(JSON.stringify({
          status: "classifying",
          message: "Analyzing document type..."
        }) + "\n"));

        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 2000,
          chunkOverlap: 300,
        });
        const chunks = await splitter.splitText(text);
        const sampleText = chunks.slice(0, 3).join("\n");

        const classificationPrompt = `
You are a senior legal analyst.
Classify the document into ONE category:

1. Contracts & Agreements
2. Litigation & Court Documents
3. Regulatory & Compliance
4. Corporate Governance Documents
5. Property & Real Estate
6. Government & Administrative
7. Personal Legal Documents

Excerpt:
"""${sampleText}"""

Return strict JSON:
{ "category": "exact category name" }
`;

        const classResult = await llm.invoke(classificationPrompt);
        let category = "Contracts & Agreements";
        try {
          const raw = (classResult.content as string).trim();
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          category = parsed.category || category;
        } catch (e) {
          console.warn("⚠️ Classification fallback:", e);
        }

        await saveMemoryToDB(userId, filename, "classification", { category });

        controller.enqueue(encoder.encode(JSON.stringify({
          status: "classified",
          category,
          message: `Document classified as: ${category}`
        }) + "\n"));

        // Step 2: Workflow (streaming)
        controller.enqueue(encoder.encode(JSON.stringify({
          status: "processing",
          message: "Processing document with specialized workflow..."
        }) + "\n"));

        const workflowPrompt = `
You are a legal expert analyzing a ${category} document.
Provide a detailed analysis of the following text:
"""${chunks.slice(0, 5).join("\n")}"""

Return your analysis in JSON format:
{
  "summary": "Concise summary of the document",
  "keyPoints": ["List of key points"],
  "recommendations": ["List of recommendations"],
  "risks": ["List of potential risks or issues"]
}
`;

        const workflowStream = await streamingLlm.stream(workflowPrompt);

        let workflowResult = "";
        for await (const chunk of workflowStream) {
          const content = chunk.content as string;
          workflowResult += content;

          controller.enqueue(encoder.encode(JSON.stringify({
            status: "streaming",
            content
          }) + "\n"));
        }

        // Step 2b: Parse final workflow result
        let workflowOutput = { summary: "No summary", jsonData: {} };
        try {
          const cleaned = workflowResult.replace(/```json|```/g, "").trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            workflowOutput = {
              summary: parsed.summary || "No summary",
              jsonData: parsed
            };
          }
        } catch (e) {
          console.warn("⚠️ Workflow output parsing error:", e);
          workflowOutput = {
            summary: workflowResult.slice(0, 500),
            jsonData: { rawOutput: workflowResult }
          };
        }

        await saveMemoryToDB(userId, filename, "workflow", workflowOutput);

        // Step 3: UI generation
        controller.enqueue(encoder.encode(JSON.stringify({
          status: "generating_ui",
          message: "Generating interactive display..."
        }) + "\n"));

        const ui = await generateAdaptiveUI(workflowOutput);
        await saveMemoryToDB(userId, filename, "ui-generation", ui);

        // Final result
        controller.enqueue(encoder.encode(JSON.stringify({
          status: "complete",
          result: { category, workflowOutput, uiStructure: ui }
        }) + "\n"));

        // ✅ close only once, after all enqueues
        controller.close();

      } catch (error) {
        console.error("Streaming workflow error:", error);
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(JSON.stringify({
          status: "error",
          message: "An error occurred during processing",
          error: String(error)
        }) + "\n"));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
