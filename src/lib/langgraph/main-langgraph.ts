// src/lib/langgraph/enhanced-main-langgraph.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { searchGoogle } from "../utils/google-search";
import { generateAdaptiveUI } from "../utils/enhanced-ui-generator";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.2,
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
  uiStructure?: any;
  streamingUpdates?: Array<{
    step: string;
    data: any;
    timestamp: number;
  }>;
}

// Step 1: Classify document category with streaming updates
async function classifyDocument(state: ProcessingState): Promise<ProcessingState> {
  console.log('🔍 [STREAM] Starting document classification...');
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 300,
  });
  
  const chunks = await splitter.splitText(state.text);
  const sampleText = chunks.slice(0, 4).join("\n");
  
  const prompt = `
As an expert legal document classifier, analyze this document and determine its category.

CATEGORIES:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

DOCUMENT ANALYSIS:
"""${sampleText}"""

Instructions:
- Consider the document's primary purpose, language, and legal context
- Look for key indicators like contract terms, court references, regulatory language
- Return ONLY the exact category name from the list above
- Be precise and confident in your classification

Category:`;

  const result = await llm.invoke(prompt);
  const category = (result.content as string).trim();
  
  console.log(`✅ [STREAM] Document classified as: ${category}`);
  
  return { 
    ...state, 
    category,
    streamingUpdates: [
      ...(state.streamingUpdates || []),
      {
        step: 'classification',
        data: { category },
        timestamp: Date.now()
      }
    ]
  };
}

// Step 2: Generate contextual title
async function generateTitle(state: ProcessingState): Promise<ProcessingState> {
  console.log('📝 [STREAM] Generating document title...');
  
  const prompt = `
Create a clear, professional title for this ${state.category} document.

REQUIREMENTS:
- Maximum 6-8 words
- Capture the document's main purpose
- Use professional legal terminology where appropriate
- Make it immediately understandable

CONTEXT:
- Category: ${state.category}
- Filename: ${state.filename}
- Content Preview: ${state.text.slice(0, 1200)}

Generate only the title:`;

  const result = await llm.invoke(prompt);
  const title = (result.content as string).trim().replace(/['"]/g, '');
  
  console.log(`✅ [STREAM] Title generated: ${title}`);
  
  return { 
    ...state, 
    title,
    streamingUpdates: [
      ...(state.streamingUpdates || []),
      {
        step: 'title',
        data: { title },
        timestamp: Date.now()
      }
    ]
  };
}

// Step 3: Comprehensive content analysis
async function analyzeContent(state: ProcessingState): Promise<ProcessingState> {
  console.log('🧠 [STREAM] Analyzing document content...');
  
  const prompt = `
Conduct a comprehensive analysis of this ${state.category} document.

DOCUMENT: ${state.text}

Provide a detailed JSON analysis with the following structure:
{
  "summaryText": "Clear, comprehensive 3-4 sentence summary explaining what this document is and its primary purpose",
  "importantPoints": [
    "First critical point or key provision",
    "Second important aspect or requirement", 
    "Third significant detail or obligation",
    "Fourth key consideration or benefit",
    "Fifth important point if applicable"
  ],
  "mainRisksRightsConsequences": "Detailed explanation of the main legal implications, rights granted/restricted, and potential consequences of this document",
  "whatHappensIfYouIgnoreThis": "Specific consequences, penalties, or missed opportunities if this document is ignored or not properly handled",
  "whatYouShouldDoNow": [
    "First immediate action required",
    "Second important step to take",
    "Third recommended action",
    "Fourth consideration if applicable"
  ],
  "importantNote": "Single most critical thing the reader must remember about this document",
  "keyDates": ["List any important dates, deadlines, or time-sensitive elements"],
  "parties": ["List the main parties or entities involved"],
  "legalContext": "Brief explanation of the legal framework or jurisdiction this falls under"
}

Make your analysis thorough, practical, and immediately actionable.`;

  const result = await llm.invoke(prompt);
  let summary;
  try {
    const content = result.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      summary = JSON.parse(jsonMatch[0]);
    } else {
      summary = JSON.parse(content.replace(/```json|```/g, '').trim());
    }
  } catch (error) {
    console.error('Failed to parse summary JSON:', error);
    summary = { 
      summaryText: "Document analysis completed with technical limitations", 
      importantPoints: ["Analysis partially completed"],
      importantNote: "Please review the full document text for complete details"
    };
  }
  
  console.log('✅ [STREAM] Content analysis completed');
  
  return { 
    ...state, 
    summary,
    streamingUpdates: [
      ...(state.streamingUpdates || []),
      {
        step: 'analysis',
        data: { summary },
        timestamp: Date.now()
      }
    ]
  };
}

// Step 4: Advanced clause extraction
async function extractClauses(state: ProcessingState): Promise<ProcessingState> {
  console.log('📋 [STREAM] Extracting key clauses...');
  
  const prompt = `
Extract and analyze the most important clauses, terms, or sections from this ${state.category}.

DOCUMENT: ${state.text}

For each important clause/section, provide:
[
  {
    "clause": "Title or key phrase of the clause/section",
    "explanation": {
      "Explanation": "Clear explanation of what this clause means in plain English and its practical implications",
      "PunishmentDetails": "Specific consequences, penalties, or enforcement mechanisms if this clause is violated (if applicable)"
    },
    "importance": "high|medium|low",
    "category": "obligation|right|restriction|procedure|penalty|benefit",
    "applicableParties": ["Who this clause affects"],
    "timeframe": "When this clause applies or any relevant deadlines"
  }
]

Focus on:
- The 5-7 most critical clauses/sections
- Clauses that create obligations or grant rights
- Terms with potential penalties or consequences
- Procedural requirements or deadlines
- Financial or legal implications

Return valid JSON array only.`;

  const result = await llm.invoke(prompt);
  let clauses = [];
  try {
    const content = result.content as string;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      clauses = JSON.parse(jsonMatch[0]);
    } else {
      clauses = JSON.parse(content.replace(/```json|```/g, '').trim());
    }
  } catch (error) {
    console.error('Failed to parse clauses JSON:', error);
    clauses = [];
  }
  
  console.log(`✅ [STREAM] Extracted ${clauses.length} key clauses`);
  
  return { 
    ...state, 
    clauses,
    streamingUpdates: [
      ...(state.streamingUpdates || []),
      {
        step: 'clauses',
        data: { clauses, count: clauses.length },
        timestamp: Date.now()
      }
    ]
  };
}

// Step 5: Enhanced web search for related information
async function searchRelatedInfo(state: ProcessingState): Promise<ProcessingState> {
  console.log('🔍 [STREAM] Searching for related information...');
  
  try {
    const searchTerms = [
      `${state.category} legal requirements guide`,
      `${state.title} legal analysis`,
      `${state.category} compliance checklist`,
    ];

    const searchResults = await Promise.all(
      searchTerms.map(term => searchGoogle(term))
    );

    const relatedInfo = searchResults
      .flat()
      .filter(result => result && result.title && result.link)
      .slice(0, 8) // Get top 8 results
      .map(result => ({
        title: result.title,
        snippet: result.snippet || 'Additional information available',
        link: result.link,
        relevance: 'high'
      }));

    console.log(`✅ [STREAM] Found ${relatedInfo.length} related resources`);
    
    return { 
      ...state, 
      relatedInfo,
      streamingUpdates: [
        ...(state.streamingUpdates || []),
        {
          step: 'search',
          data: { relatedInfo, count: relatedInfo.length },
          timestamp: Date.now()
        }
      ]
    };
  } catch (error) {
    console.error('Search failed:', error);
    return { 
      ...state, 
      relatedInfo: [],
      streamingUpdates: [
        ...(state.streamingUpdates || []),
        {
          step: 'search',
          data: { error: 'Search temporarily unavailable' },
          timestamp: Date.now()
        }
      ]
    };
  }
}

// Step 6: Generate adaptive UI structure
async function generateUI(state: ProcessingState): Promise<ProcessingState> {
  console.log('🎨 [STREAM] Generating adaptive UI structure...');
  
  try {
    const uiStructure = await generateAdaptiveUI({
      category: state.category!,
      title: state.title!,
      summary: state.summary,
      clauses: state.clauses || [],
      relatedInfo: state.relatedInfo,
    });

    console.log('✅ [STREAM] UI structure generated with visual elements');
    
    return { 
      ...state, 
      uiStructure,
      streamingUpdates: [
        ...(state.streamingUpdates || []),
        {
          step: 'ui',
          data: { 
            uiStructure: {
              complexity: uiStructure.metadata.complexity,
              elementCount: uiStructure.totalElements,
              hasInteractiveElements: uiStructure.metadata.hasInteractiveElements,
              hasVisualElements: uiStructure.metadata.hasVisualElements
            }
          },
          timestamp: Date.now()
        }
      ]
    };
  } catch (error) {
    console.error('UI generation failed:', error);
    return {
      ...state,
      streamingUpdates: [
        ...(state.streamingUpdates || []),
        {
          step: 'ui',
          data: { error: 'UI generation completed with limitations' },
          timestamp: Date.now()
        }
      ]
    };
  }
}

// Main streaming LangGraph execution with progress tracking
export async function runLanggraphStream({
  text,
  filename,
  userId
}: {
  text: string;
  filename: string;
  userId: string;
}): Promise<any> {
  let state: ProcessingState = { 
    text, 
    filename, 
    userId,
    streamingUpdates: []
  };

  const startTime = Date.now();

  try {
    // Execute pipeline steps with streaming updates
    console.log('🚀 [STREAM] Starting document processing pipeline...');
    
    state = await classifyDocument(state);
    state = await generateTitle(state);
    state = await analyzeContent(state);
    state = await extractClauses(state);
    state = await searchRelatedInfo(state);
    state = await generateUI(state);

    const processingTime = Date.now() - startTime;
    console.log(`✅ [STREAM] Pipeline completed in ${processingTime}ms`);

    return {
      filename: state.filename,
      content: state.text,
      category: state.category,
      title: state.title,
      summary: state.summary,
      clauses: state.clauses || [],
      important_points: state.summary?.importantPoints || [],
      structure: state.summary?.legalContext || [],
      relatedInfo: state.relatedInfo,
      uiStructure: state.uiStructure,
      processingMetadata: {
        processingTime,
        stepsCompleted: state.streamingUpdates?.length || 0,
        userId: state.userId,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ [STREAM] Pipeline failed:', error);
    throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}