// src/lib/langgraph/main-langgraph.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { searchGoogle } from "../utils/google-search";
import { generateUIComponent } from "../utils/ui-generator";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0,
  streaming: true,
});

const CATEGORIES = [
  "Contracts & Agreements",
  "Litigation & Court Documents", 
  "Regulatory & Compliance",
  "Corporate Governance Documents",
  "Property & Real Estate",
  "Government & Administrative",
  "Personal Legal Documents",
];

interface ProcessingState {
  text: string;
  filename: string;
  userId: string;
  category?: string;
  title?: string;
  summary?: any;
  clauses?: any[];
  relatedInfo?: any;
  uiComponent?: string;
}

// Step 1: Classify document category
async function classifyDocument(state: ProcessingState): Promise<ProcessingState> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });
  
  const chunks = await splitter.splitText(state.text);
  const sampleText = chunks.slice(0, 3).join("\n");
  
  const prompt = `
Analyze this legal document and classify it into ONE of these categories:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Document text:
"""${sampleText}"""

Return only the category name exactly as listed above.`;

  const result = await llm.invoke(prompt);
  const category = (result.content as string).trim();
  
  return { ...state, category };
}

// Step 2: Generate title
async function generateTitle(state: ProcessingState): Promise<ProcessingState> {
  const prompt = `
Create a concise, descriptive title (max 8 words) for this legal document:

Category: ${state.category}
Filename: ${state.filename}
Content: ${state.text.slice(0, 1000)}

Return only the title.`;

  const result = await llm.invoke(prompt);
  const title = (result.content as string).trim().replace(/['"]/g, '');
  
  return { ...state, title };
}

// Step 3: Extract and analyze content
async function analyzeContent(state: ProcessingState): Promise<ProcessingState> {
  const prompt = `
Analyze this ${state.category} document and provide a structured analysis:

Document: ${state.text}

Return a JSON object with:
{
  "summaryText": "Clear, concise summary in 2-3 sentences",
  "importantPoints": ["key point 1", "key point 2", "key point 3"],
  "mainRisksRightsConsequences": "What are the main legal implications?",
  "whatHappensIfYouIgnoreThis": "Consequences of non-compliance or inaction",
  "whatYouShouldDoNow": ["immediate action 1", "immediate action 2"],
  "importantNote": "Most critical thing to remember",
  "keyDates": ["important dates if any"],
  "parties": ["involved parties if applicable"]
}`;

  const result = await llm.invoke(prompt);
  let summary;
  try {
    const content = result.content as string;
    summary = JSON.parse(content.replace(/```json|```/g, '').trim());
  } catch {
    summary = { summaryText: "Analysis failed", importantPoints: [] };
  }
  
  return { ...state, summary };
}

// Step 4: Extract clauses for legal documents
async function extractClauses(state: ProcessingState): Promise<ProcessingState> {
  const prompt = `
Extract important clauses, terms, or sections from this ${state.category}:

${state.text}

Return a JSON array of objects with:
[
  {
    "clause": "Clause title or key phrase",
    "explanation": {
      "Explanation": "What this means in simple terms",
      "PunishmentDetails": "Consequences or penalties if applicable"
    },
    "importance": "high|medium|low"
  }
]

Limit to 5 most important clauses.`;

  const result = await llm.invoke(prompt);
  let clauses = [];
  try {
    const content = result.content as string;
    clauses = JSON.parse(content.replace(/```json|```/g, '').trim());
  } catch {
    clauses = [];
  }
  
  return { ...state, clauses };
}

// Step 5: Search for related information
async function searchRelatedInfo(state: ProcessingState): Promise<ProcessingState> {
  try {
    const searchTerms = `${state.category} ${state.title} legal requirements`;
    const relatedInfo = await searchGoogle(searchTerms);
    return { ...state, relatedInfo };
  } catch (error) {
    console.error('Search failed:', error);
    return { ...state, relatedInfo: null };
  }
}

// Step 6: Generate UI component
async function generateUI(state: ProcessingState): Promise<ProcessingState> {
  try {
    const uiComponent = await generateUIComponent({
      category: state.category!,
      title: state.title!,
      summary: state.summary,
      clauses: state.clauses,
      relatedInfo: state.relatedInfo,
    });
    return { ...state, uiComponent };
  } catch (error) {
    console.error('UI generation failed:', error);
    return state;
  }
}

// Main streaming LangGraph execution
export async function runLanggraphStream({
  text,
  filename,
  userId
}: {
  text: string;
  filename: string;
  userId: string;
}): Promise<any> {
  let state: ProcessingState = { text, filename, userId };

  // Execute pipeline steps
  console.log('🔍 Classifying document...');
  state = await classifyDocument(state);
  
  console.log('📝 Generating title...');
  state = await generateTitle(state);
  
  console.log('🔍 Analyzing content...');
  state = await analyzeContent(state);
  
  console.log('📋 Extracting clauses...');
  state = await extractClauses(state);
  
  console.log('🔍 Searching related info...');
  state = await searchRelatedInfo(state);
  
  console.log('🎨 Generating UI...');
  state = await generateUI(state);

  return {
    filename: state.filename,
    content: state.text,
    category: state.category,
    title: state.title,
    summary: state.summary,
    clauses: state.clauses || [],
    important_points: state.summary?.importantPoints || [],
    structure: [],
    relatedInfo: state.relatedInfo,
    uiComponent: state.uiComponent,
  };
}