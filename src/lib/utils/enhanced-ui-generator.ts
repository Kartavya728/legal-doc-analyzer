// src/lib/utils/enhanced-ui-generator.ts
/**
 * Enhanced Adaptive UI Generator (using Gemini 2.5 Pro)
 *
 * - Accepts workflowOutput (summary + jsonData) produced by your category workflows
 * - Runs three parallel stages:
 *    1) Title & summary updater (update/normalize title + short summary)
 *    2) Decision model that decides which components to include (>=3)
 *    3) Component content generator for each decided component (parallel)
 * - Uses searchGoogle optionally for "websearch" component resources
 * - Enforces Images component only when strongly needed
 * - Ensures at least two components have distinct content
 *
 * Output: AdaptiveUIPayload (elements, component content, metadata, small generatedCode fallback)
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { searchGoogle } from "./google-search"; // adjust path to your helper if needed

type CategoryTheme = Record<string, string>;

// ---------- Types ----------
export interface UIGeneratorInput {
  category: string;
  title?: string;
  summary?: any; // workflowOutput.summary (string) or object
  jsonData?: any; // workflowOutput.jsonData (structured)
  chatbotQuestions?: string[]; // optional pre-seeded Qs
  sampleData?: Record<string, any>[]; // optional sample rows for tables / charts
}

export type UIComponentKind =
  | "table"
  | "chart"
  | "dropdown"
  | "text"
  | "grid"
  | "form"
  | "card"
  | "timeline"
  | "selector"
  | "flowchart"
  | "images"
  | "websearch";

export interface UIComponentSpec {
  id: string;
  kind: UIComponentKind;
  title: string;
  description: string;
  dataState?: {
    kind: "tabular" | "timeseries" | "categorical" | "none";
    sample?: any;
    columns?: { key: string; label: string; type?: string }[];
  };
  props?: Record<string, any>;
  priority?: "high" | "medium" | "low";
}

export interface UIElement {
  type: "section" | "card" | "visual" | "interactive" | "data";
  id: string;
  title: string;
  content?: any;
  layout: "grid" | "carousel" | "stack" | "split";
  priority: "high" | "medium" | "low";
  visualEffects?: {
    animation?: "fade" | "slide" | "zoom" | "pulse";
    gradient?: boolean;
    glassmorphism?: boolean;
    shadows?: boolean;
  };
}

export interface AdaptiveUIPayload {
  layout: "adaptive-grid";
  theme: CategoryTheme;
  totalElements: number;
  renderOrder: string[];
  elements: Record<string, UIElement>;
  generatedContent: Record<
    string,
    {
      spec: UIComponentSpec;
      content: any;
    }
  >;
  generatedCode?: string; // optional code string (fallback)
  displayData: {
    summary: {
      summaryText?: string;
      importantPoints?: string[];
      mainRisksRightsConsequences?: string;
      whatYouShouldDoNow?: string[];
      whatHappensIfYouIgnoreThis?: string;
    };
    clauses: Array<{
      title: string;
      content: string;
      importance: string;
      explanation: string;
    }>;
    relatedInfo: Array<{
      title: string;
      description: string;
      icon: string;
      link: string;
    }>;
    tables: Array<{
      title: string;
      description: string;
      columns: Array<{ key: string; label: string }>;
      rows: any[];
    }>;
    flowCharts: Array<{
      title: string;
      description: string;
      events: Array<{
        date: string;
        title: string;
        description: string;
        impact: string;
      }>;
    }>;
    images: Array<{
      url: string;
      alt: string;
      caption: string;
    }>;
  };
  metadata: {
    generatedAt: string;
    category: string;
    complexity: "low" | "medium" | "high";
    hasInteractiveElements: boolean;
    hasVisualElements: boolean;
    decisionModelUsedLLM: boolean;
    codeGenModelUsedLLM: boolean;
    debug?: any;
  };
}

// ---------- Helpers ----------
function uuid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function parseJsonSafe<T = any>(s: string): T | null {
  try {
    const match = s.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const toParse = match ? match[0] : s;
    return JSON.parse(toParse);
  } catch {
    return null;
  }
}

function getCategoryTheme(category: string): CategoryTheme {
  const themes: Record<string, CategoryTheme> = {
    "Contracts & Agreements": {
      primary: "#3B82F6",
      secondary: "#1E40AF",
      accent: "#60A5FA",
      background: "linear-gradient(135deg,#1e3a8a20,#3b82f620)",
    },
    "Litigation & Court Documents": {
      primary: "#EF4444",
      secondary: "#B91C1C",
      accent: "#F87171",
      background: "linear-gradient(135deg,#b91c1c20,#ef444420)",
    },
    "Regulatory & Compliance": {
      primary: "#10B981",
      secondary: "#047857",
      accent: "#34D399",
      background: "linear-gradient(135deg,#04785720,#10b98120)",
    },
    "Personal Legal Documents": {
      primary: "#EC4899",
      secondary: "#DB2777",
      accent: "#F472B6",
      background: "linear-gradient(135deg,#db277720,#ec489920)",
    },
  };
  return themes[category] || themes["Personal Legal Documents"];
}

// ---------- LLM: Gemini 2.5 Pro instance ----------
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.12,
  streaming: false,
});

/* ---------------------------
   LLM CALL WRAPPER
   returns the raw string (content) from Gemini, with safe fallback
---------------------------- */
async function callLLM(prompt: string, timeoutMs = 30000): Promise<string> {
  try {
    // Basic timeout guard
    const p = llm.invoke(prompt);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LLM call timeout")), timeoutMs)
    );
    const res: any = await Promise.race([p, timeout]);
    if (!res) return "";
    if (typeof res.content === "string") return res.content;
    // attempt to stringify structured content
    return JSON.stringify(res.content || res, null, 2);
  } catch (err: any) {
    console.warn("callLLM error:", err);
    return `{"error":"LLM error: ${String(err)}"}`;
  }
}

/* ===========================
   1) Title & Summary Updater
=========================== */
async function updateTitleAndSummary(input: UIGeneratorInput) {
  const prompt = `
You are an expert assistant that writes concise titles and short summaries.

Context:
- file category: ${input.category}
- existing title (may be absent): ${input.title || "N/A"}
- workflow summary (may be long): ${safeStringify(input.summary || {})}
- jsonData (structured) keys: ${Object.keys(input.jsonData || {}).join(", ") || "none"}

Task (STRICT JSON output):
{
  "title": "A short, professional 3-8 word title summarizing the document",
  "summary": "One or two clear sentences suitable for an Executive Summary card",
  "recommendedChatQuestions": [
    "Single short question per string - 4 to 6 items useful for the chatbot"
  ]
}

Constraints:
- Title must be 3-8 words, legal/technical tone where appropriate
- Summary must not repeat verbatim long text; be concise and user-actionable
- recommendedChatQuestions should be relevant to the document's actionable points
Return ONLY valid JSON.
  `;

  const out = await callLLM(prompt);
  const parsed = parseJsonSafe(out);
  return {
    title: parsed?.title || input.title || "Document Overview",
    shortSummary:
      parsed?.summary ||
      (typeof input.summary === "string"
        ? input.summary.slice(0, 300)
        : (input.summary?.summaryText || "").slice(0, 300)) ||
      "Summary unavailable.",
    recommendedChatQuestions: parsed?.recommendedChatQuestions || [
      "What are the key points?",
      "What should I do next?",
      "Are there any deadlines?",
    ],
    raw: out,
  };
}

/* ===========================
   2) Decision Model: choose components
=========================== */
async function decideComponents(input: UIGeneratorInput) {
  const prompt = `
You are a senior product + design + legal analyst. Given a document's category and structured data, decide which UI components should be included in a single-page analysis dashboard.

Inputs:
- category: ${input.category}
- summary: ${safeStringify(input.summary || {})}
- jsonData keys: ${Object.keys(input.jsonData || {}).join(", ") || "none"}
- sampleData length: ${(input.sampleData || []).length}

Available component kinds: table, chart, dropdown, text, grid, form, card, timeline, selector, flowchart, images, websearch.

Rules (STRICT):
1) Return JSON only: { components: [...], rationale: "..."}
2) Provide between 3 and 6 components.
3) Always include a "Summary" card as the first component.
4) Include at least one INTERACTIVE component (dropdown/selector) for detail exploration.
5) At least two components must serve distinct content purposes (e.g., "Skills table" vs "Timeline of dates").
6) Do NOT include images unless input.jsonData explicitly contains 'images' or there's clear reason (e.g., portfolio with screenshots). If you include 'images', explain why.
7) If many dates present -> include timeline or flowchart. If many numeric values present -> include chart + table. If document contains skills/achievements -> include table or grid of skills + separate highlights card.
8) For each component return: { id, kind, title, description, dataState:{ kind, sample?, columns? }, props?, priority }

Provide a short rationale describing why you chose these components.

Return only JSON.
`;

  let outRaw: string;
  try {
    outRaw = await callLLM(prompt);
  } catch (err) {
    outRaw = "";
    console.warn("Decision model LLM call failed:", err);
  }

  let parsed = parseJsonSafe(outRaw);

  // If LLM didn't return components as expected, fallback to heuristics
  if (!parsed || !Array.isArray(parsed?.components)) {
    const comps: UIComponentSpec[] = [];

    // Always include summary card
    comps.push({
      id: uuid("summary-"),
      kind: "card",
      title: "Executive Summary",
      description: "Concise summary card for main takeaways.",
      dataState: { kind: "none", sample: [] },
      priority: "high",
    });

    const jsonData = input.jsonData || {};
    const keyDates = jsonData.keyDates || input.summary?.keyDates || [];
    const skills = jsonData.skills || jsonData.achievements || input.summary?.importantPoints || [];

    if (Array.isArray(keyDates) && keyDates.length > 0) {
      comps.push({
        id: uuid("timeline-"),
        kind: "timeline",
        title: "Key Dates & Milestones",
        description: "Timeline of important dates and deadlines.",
        dataState: { kind: "timeseries", sample: keyDates.slice(0, 20) },
        priority: "high",
      });
      comps.push({
        id: uuid("table-"),
        kind: "table",
        title: "Milestones Table",
        description: "Tabular listing of dates and descriptions.",
        dataState: { kind: "tabular", sample: keyDates.slice(0, 30) },
        priority: "medium",
      });
    } else if (Array.isArray(skills) && skills.length > 0) {
      comps.push({
        id: uuid("skills-"),
        kind: "table",
        title: "Skills & Achievements",
        description: "Skills and achievements extracted from the document.",
        dataState: {
          kind: "tabular",
          sample: (Array.isArray(skills) ? skills.slice(0, 30) : []).map((s: any, i: number) =>
            typeof s === "string" ? { id: i + 1, text: s } : { id: i + 1, ...s }
          ),
          columns: [{ key: "id", label: "No." }, { key: "text", label: "Skill / Achievement" }],
        },
        priority: "high",
      });
      comps.push({
        id: uuid("highlights-"),
        kind: "grid",
        title: "Top Highlights",
        description: "Bulleted highlights separated from the full table for quick scanning.",
        dataState: { kind: "categorical", sample: skills.slice(0, 6) },
        props: { columns: 2 },
        priority: "medium",
      });
    } else {
      comps.push({
        id: uuid("table-default-"),
        kind: "table",
        title: "Quick Reference Table",
        description: "Fallback tabular view for quick inspection.",
        dataState: { kind: "tabular", sample: input.sampleData?.slice(0, 10) || [] },
        priority: "medium",
      });
      comps.push({
        id: uuid("filter-"),
        kind: "dropdown",
        title: "Detailed View",
        description: "Dropdown to switch between analysis views: summary/detailed/risk/clauses.",
        dataState: { kind: "categorical", sample: ["Summary View", "Detailed Analysis", "Risks", "Clauses"] },
        priority: "low",
      });
    }

    parsed = { components: comps, rationale: `Fallback heuristic chosen based on keyDates=${(keyDates || []).length} skills=${(skills || []).length}` };
  }

  // Post-process
  let components: UIComponentSpec[] = (parsed.components || []).slice(0, 6);

  // unique titles only
  const seenTitles = new Set<string>();
  components = components.filter((c) => {
    if (!c.title) return false;
    const t = c.title.trim().toLowerCase();
    if (seenTitles.has(t)) return false;
    seenTitles.add(t);
    return true;
  });

  // ensure at least 3 components
  if (components.length < 3) {
    components.push({
      id: uuid("summary-"),
      kind: "card",
      title: "Executive Summary",
      description: "Concise summary of the document.",
      dataState: { kind: "none", sample: [] },
      priority: "high",
    });
    components.push({
      id: uuid("view-"),
      kind: "dropdown",
      title: "View Options",
      description: "Toggle between summary and detailed analysis",
      dataState: { kind: "categorical", sample: ["Summary", "Detailed"] },
      priority: "low",
    });
  }

  // remove images if json doesn't include images
  const hasImagesInData = Array.isArray(input.jsonData?.images) && input.jsonData.images.length > 0;
  const includesImages = components.some((c) => c.kind === "images");
  if (includesImages && !hasImagesInData) {
    components = components.filter((c) => c.kind !== "images");
  }

  return {
    components,
    rationale: parsed.rationale || "Decision model fallback",
    usedLLM: !!parsed && !!parsed.components && parsed.components.length > 0,
    raw: parsed,
  };
}

/* ===========================
   3) Component content generation
=========================== */
async function generateComponentContent(spec: UIComponentSpec, input: UIGeneratorInput) {
  const jsonData = input.jsonData || {};
  const sampleData = input.sampleData || [];

  async function runLLMForComponent(prompt: string) {
    try {
      const out = await callLLM(prompt);
      const parsed = parseJsonSafe(out);
      return parsed ?? { text: (out || "").toString().trim() };
    } catch (err) {
      return { text: `LLM error: ${String(err)}` };
    }
  }

  switch (spec.kind) {
    case "card": {
      const prompt = `
You are writing content for a "Summary Card" UI component.
Input summary/object:
${safeStringify(input.summary || jsonData || {})}

Return JSON:
{
  "summaryText": "Detailed summary paragraph about the document",
  "importantPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "mainRisksRightsConsequences": "Detailed description of risks, rights, and consequences",
  "whatYouShouldDoNow": ["Action item 1", "Action item 2", "Action item 3"],
  "whatHappensIfYouIgnoreThis": "Description of consequences if ignored"
}
`;
      const content = await runLLMForComponent(prompt);
      return { id: spec.id, spec, content };
    }

    case "table": {
      let sample = spec.dataState?.sample ?? sampleData;
      if (!Array.isArray(sample) || sample.length === 0) {
        const fallbackRows: any[] = [];
        if (Array.isArray(jsonData?.projects)) {
          fallbackRows.push(...(jsonData.projects as any[]).slice(0, 10));
        } else if (Array.isArray(jsonData?.keyDates)) {
          fallbackRows.push(...(jsonData.keyDates as any[]).slice(0, 20));
        } else if (Array.isArray(jsonData?.skills)) {
          (jsonData.skills as any[]).slice(0, 20).forEach((s, i) => fallbackRows.push({ id: i + 1, skill: s }));
        }
        sample = fallbackRows;
      }

      if (!Array.isArray(sample) || sample.length === 0) {
        const prompt = `
Create up to 6 example rows for a table titled "${spec.title}" based on this summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array of objects with columns: title, description, relevance.
`;
        const rows = await runLLMForComponent(prompt);
        sample = Array.isArray(rows) ? rows : [];
      }

      const columns =
        spec.dataState?.columns ??
        (Array.isArray(sample) && sample.length > 0 ? Object.keys(sample[0]).map((k) => ({ key: k, label: k })) : []);

      const tables = [
        {
          title: spec.title || "Document Analysis",
          description: spec.description || "Key information extracted from the document",
          columns,
          rows: sample,
        },
      ];

      return { id: spec.id, spec, content: { tables } };
    }

    case "timeline":
    case "flowchart": {
      let events = jsonData?.keyDates ?? input.summary?.keyDates ?? [];
      if (!Array.isArray(events) || events.length === 0) {
        const prompt = `
You are a timeline extractor. Based on this summary produce 4-8 timeline events:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "date":"YYYY-MM-DD", "title":"", "description":"", "impact":"" }]
`;
        const out = await runLLMForComponent(prompt);
        events = Array.isArray(out) ? out : [];
      }

      const flowCharts = [
        {
          title: spec.title || "Document Timeline",
          description: spec.description || "Key events and milestones",
          events,
        },
      ];

      return { id: spec.id, spec, content: { flowCharts } };
    }

    case "grid": {
      let cards = spec.dataState?.sample ?? input.summary?.importantPoints ?? jsonData?.highlights ?? [];
      if (!Array.isArray(cards) || cards.length === 0) {
        const prompt = `
Create 6 short highlight cards (title & one-line subtitle) for the document summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "title":"", "subtitle":"", "icon":"info|warning|check|alert", "link":"" }]
`;
        const out = await runLLMForComponent(prompt);
        cards = Array.isArray(out) ? out : [];
      }

      const relatedInfo = cards.map((card: any) => ({
        title: card.title || "",
        description: card.subtitle || card.description || "",
        icon: card.icon || "info",
        link: card.link || "",
      }));

      return { id: spec.id, spec, content: { relatedInfo } };
    }

    case "dropdown":
    case "selector": {
      const options = spec.dataState?.sample ?? ["Summary", "Detailed", "Risks", "Clauses"];
      return { id: spec.id, spec, content: { options } };
    }

    case "text": {
      let clauses = jsonData?.clauses || [];
      if (!Array.isArray(clauses) || clauses.length === 0) {
        const prompt = `
Extract 3-5 important clauses from this legal document summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "title":"", "content":"", "importance":"high|medium|low", "explanation":"" }]
`;
        const out = await runLLMForComponent(prompt);
        clauses = Array.isArray(out) ? out : [];
      }
      return { id: spec.id, spec, content: { clauses } };
    }

    case "chart": {
      let dataset = spec.dataState?.sample ?? sampleData ?? jsonData?.amounts ?? [];
      if (!Array.isArray(dataset) || dataset.length === 0) {
        const prompt = `
Produce up to 8 numeric datapoints (label + value) appropriate for a chart titled "${spec.title}" based on this summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "label": "X", "value": 123 }]
`;
        const out = await runLLMForComponent(prompt);
        dataset = Array.isArray(out) ? out : [];
      }
      return { id: spec.id, spec, content: { dataset } };
    }

    case "websearch": {
      const q = spec.props?.query || input.title || (input.summary && (input.summary.summaryText || input.summary));
      let results: any[] = [];
      try {
        if (typeof searchGoogle === "function" && q) {
          results = await searchGoogle(String(q));
          results = (results || []).slice(0, 6).map((r: any) => ({
            title: r.title || r.name || r.heading,
            snippet: r.snippet || r.description || "",
            link: r.link || r.url,
            source: r.source || (r.link ? new URL(r.link).hostname : "web"),
          }));
        }
      } catch (err) {
        results = [];
      }
      return { id: spec.id, spec, content: { query: q, results } };
    }

    case "images": {
      const imageData = Array.isArray(jsonData?.images) ? jsonData.images : [];
      const images = imageData.map((img: any) => ({
        url: img.url || img.src || "",
        alt: img.alt || img.description || "Document image",
        caption: img.caption || img.title || "",
      }));
      return { id: spec.id, spec, content: { images } };
    }

    default: {
      const prompt = `
Prepare text content for a component titled "${spec.title}" based on this document:
${safeStringify(input.summary || jsonData || {})}

Return JSON: { "text": "short text (200-400 chars)" }
`;
      const out = await runLLMForComponent(prompt);
      return { id: spec.id, spec, content: out };
    }
  }
}

/* ===========================
   Top-level: generateAdaptiveUI
=========================== */
export async function generateAdaptiveUI(input: UIGeneratorInput): Promise<AdaptiveUIPayload> {
  console.log("📥 [UI GEN] starting with input:", safeStringify(input).slice(0, 2000));

  const theme = getCategoryTheme(input.category || "Personal Legal Documents");

  // A) Title & summary update, B) Decision model
  const [titleSummaryResult, decisionResult] = await Promise.all([
    updateTitleAndSummary(input),
    decideComponents(input),
  ]);

  // normalize decided components and ensure ids
  const decidedComponents: UIComponentSpec[] = (decisionResult.components || []).map((c) => {
    if (!c.id) c.id = uuid("comp-");
    return c;
  });

  // Guarantee at least 3 components (fallback)
  if (decidedComponents.length < 3) {
    while (decidedComponents.length < 3) {
      decidedComponents.push({
        id: uuid("fallback-"),
        kind: "card",
        title: "Additional Summary",
        description: "Fallback auto-generated summary card",
        dataState: { kind: "none", sample: [] },
        priority: "low",
      });
    }
  }

  // Dedupe by title
  const uniqueByTitle: UIComponentSpec[] = [];
  const seen = new Set<string>();
  for (const c of decidedComponents) {
    const key = (c.title || c.kind || c.id).toString().trim().toLowerCase();
    if (!seen.has(key)) {
      uniqueByTitle.push(c);
      seen.add(key);
    }
  }

  // Filter out images if input doesn't have images
  const hasImagesData = Array.isArray(input.jsonData?.images) && input.jsonData.images.length > 0;
  const finalComponents = uniqueByTitle.filter((c) => {
    if (c.kind === "images" && !hasImagesData) return false;
    return true;
  });

  // Ensure at least 3 final components
  while (finalComponents.length < 3) {
    finalComponents.push({
      id: uuid("extra-"),
      kind: "card",
      title: "Extra Insight",
      description: "Auto-generated insight card",
      dataState: { kind: "none", sample: [] },
      priority: "low",
    });
  }

  // Generate content for each component in parallel
  const genPromises = finalComponents.map((spec) => generateComponentContent(spec, input));
  const settled = await Promise.allSettled(genPromises);

  const generatedContent: AdaptiveUIPayload["generatedContent"] = {};
  
  // Create structured displayData for Display component
  const displayData: any = {
    summary: {
      summaryText: "",
      importantPoints: [],
      mainRisksRightsConsequences: "",
      whatYouShouldDoNow: [],
      whatHappensIfYouIgnoreThis: ""
    },
    clauses: [],
    relatedInfo: [],
    tables: [],
    flowCharts: [],
    images: [],
    webSearchResults: []
  };
  
  // Print raw input data to terminal
  console.log("\n==== ENHANCED UI GENERATOR INPUT ====");
  console.log("Input data:", JSON.stringify(input, null, 2));
  console.log("========================\n");

  // Create a state map to store component data for debugging and tracking
  const componentDataMap = new Map();
  
  settled.forEach((s, idx) => {
    const spec = finalComponents[idx];
    if (s.status === "fulfilled") {
      const value = s.value;
      const content = value.content ?? value;
      generatedContent[spec.id] = { spec, content };
      
      // Store in component data map
      componentDataMap.set(spec.id, {
        kind: spec.kind,
        content: content,
        timestamp: new Date().toISOString()
      });

      // map content into displayData fields with proper structure
      if (spec.kind === "card" && content) {
        // Ensure summary has the correct structure
        displayData.summary = {
          summaryText: content.summaryText || "",
          importantPoints: Array.isArray(content.importantPoints) ? content.importantPoints : [],
          mainRisksRightsConsequences: content.mainRisksRightsConsequences || "",
          whatYouShouldDoNow: Array.isArray(content.whatYouShouldDoNow) ? content.whatYouShouldDoNow : [],
          whatHappensIfYouIgnoreThis: content.whatHappensIfYouIgnoreThis || ""
        };
      }
      if (content?.clauses) {
        // Ensure clauses have the correct structure
        displayData.clauses = Array.isArray(content.clauses) ? content.clauses.map(clause => ({
          title: clause.title || "",
          content: clause.content || "",
          importance: clause.importance || "medium",
          explanation: clause.explanation || ""
        })) : [];
      }
      if (content?.relatedInfo) {
        // Ensure relatedInfo has the correct structure
        displayData.relatedInfo = Array.isArray(content.relatedInfo) ? content.relatedInfo.map(item => ({
          title: item.title || "",
          description: item.description || "",
          icon: item.icon || "info",
          link: item.link || "#"
        })) : [];
      }
      if (content?.tables) {
        // Ensure tables have the correct structure
        displayData.tables = Array.isArray(content.tables) ? content.tables.map(table => ({
          title: table.title || "",
          description: table.description || "",
          columns: Array.isArray(table.columns) ? table.columns : [],
          rows: Array.isArray(table.rows) ? table.rows : []
        })) : [];
      }
      if (content?.flowCharts) {
        // Ensure flowCharts have the correct structure
        displayData.flowCharts = Array.isArray(content.flowCharts) ? content.flowCharts.map(chart => ({
          title: chart.title || "",
          description: chart.description || "",
          events: Array.isArray(chart.events) ? chart.events.map(event => ({
            date: event.date || "",
            title: event.title || "",
            description: event.description || "",
            impact: event.impact || ""
          })) : []
        })) : [];
      }
      if (content?.images) {
        // Ensure images have the correct structure
        displayData.images = Array.isArray(content.images) ? content.images.map(image => ({
          url: image.url || "",
          alt: image.alt || "",
          caption: image.caption || ""
        })) : [];
      }
      if (content?.webSearchResults) {
        // Ensure webSearchResults have the correct structure
        displayData.webSearchResults = Array.isArray(content.webSearchResults) ? content.webSearchResults.map(result => ({
          title: result.title || "",
          url: result.url || "",
          description: result.description || ""
        })) : [];
      }
    } else {
      generatedContent[spec.id] = {
        spec,
        content: { error: String((s as PromiseRejectedResult).reason) },
      };
      
      // Store error in component data map
      componentDataMap.set(spec.id, {
        kind: spec.kind,
        error: String((s as PromiseRejectedResult).reason),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Ensure at least two components have distinct content (simple check)
  const contentSigs = Object.values(generatedContent).map((g) => safeStringify(g.content).slice(0, 2000));
  const uniqueSigs = new Set(contentSigs);
  if (uniqueSigs.size < Math.min(2, contentSigs.length)) {
    const keys = Object.keys(generatedContent);
    if (keys.length >= 2) {
      const secondKey = keys[1];
      const spec = generatedContent[secondKey].spec;
      const regen = await generateComponentContent(spec, input);
      generatedContent[secondKey] = { spec: regen.spec, content: regen.content };
      
      // Store regenerated content in component data map
      componentDataMap.set(spec.id, {
        kind: spec.kind,
        content: regen.content,
        regenerated: true,
        timestamp: new Date().toISOString()
      });
      
      // re-populate displayData if relevant with proper structure
      const content = regen.content;
      if (spec.kind === "card" && content) {
        displayData.summary = {
          summaryText: content.summaryText || "",
          importantPoints: Array.isArray(content.importantPoints) ? content.importantPoints : [],
          mainRisksRightsConsequences: content.mainRisksRightsConsequences || "",
          whatYouShouldDoNow: Array.isArray(content.whatYouShouldDoNow) ? content.whatYouShouldDoNow : [],
          whatHappensIfYouIgnoreThis: content.whatHappensIfYouIgnoreThis || ""
        };
      }
      if (content?.clauses) displayData.clauses = content.clauses;
      if (content?.relatedInfo) displayData.relatedInfo = content.relatedInfo;
      if (content?.tables) displayData.tables = content.tables;
      if (content?.flowCharts) displayData.flowCharts = content.flowCharts;
      if (content?.images) displayData.images = content.images;
      if (content?.webSearchResults) displayData.webSearchResults = content.webSearchResults;
    }
  }
  
  // Print component data map to terminal
  console.log("\n==== COMPONENT DATA MAP ====");
  console.log("Component count:", componentDataMap.size);
  const componentDataObj = {};
  componentDataMap.forEach((value, key) => {
    componentDataObj[key] = value;
  });
  console.log("Component data:", JSON.stringify(componentDataObj, null, 2));
  console.log("========================\n");
  
  // Print displayData to terminal
  console.log("\n==== DISPLAY DATA ====");
  console.log("Display data:", JSON.stringify(displayData, null, 2));
  console.log("========================\n");

  // Convert to UIElement entries
  const elementsArray: UIElement[] = finalComponents.map((c) => {
    const type: UIElement["type"] =
      c.kind === "chart" || c.kind === "timeline" || c.kind === "flowchart" || c.kind === "images"
        ? "visual"
        : c.kind === "table"
        ? "data"
        : "interactive";
    const layout: UIElement["layout"] =
      c.kind === "chart" || c.kind === "flowchart" || c.kind === "timeline"
        ? "split"
        : c.kind === "grid"
        ? "grid"
        : "stack";
    return {
      type,
      id: c.id,
      title: c.title,
      content: {
        description: c.description,
        dataState: c.dataState,
        props: c.props,
        generatedPreview: generatedContent[c.id]?.content,
      },
      layout,
      priority: c.priority ?? "medium",
      visualEffects: { animation: "fade", gradient: true, glassmorphism: false, shadows: true },
    };
  });

  // Sort by priority
  const sorted = elementsArray.sort((a, b) => {
    const p: any = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  // Simple generatedCode fallback
  const generatedCode = `// Auto-generated UI component (fallback)
import React from "react";
export default function GeneratedUI({ dataState = {} }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      ${sorted
        .map(
          (el) => `<section key="${el.id}" style={{ padding: 12, borderRadius: 8 }}>
  <h3>${el.title}</h3>
  <pre style={{ whiteSpace: "pre-wrap" }}>${escapeForTemplate(safeStringify(generatedContent[el.id]?.content || el.content))}</pre>
</section>`
        )
        .join("\n")}
    </div>
  );
}
`;

  const adaptiveUI: AdaptiveUIPayload = {
    layout: "adaptive-grid",
    theme,
    totalElements: sorted.length,
    renderOrder: sorted.map((s) => s.id),
    elements: sorted.reduce((acc: Record<string, UIElement>, el) => {
      acc[el.id] = el;
      return acc;
    }, {}),
    generatedContent,
    generatedCode,
    displayData,
    metadata: {
      generatedAt: new Date().toISOString(),
      category: input.category,
      complexity: sorted.length > 6 ? "high" : sorted.length > 3 ? "medium" : "low",
      hasInteractiveElements: sorted.some((el) => el.type === "interactive"),
      hasVisualElements: sorted.some((el) => el.type === "visual"),
      decisionModelUsedLLM: !!(decisionResult && decisionResult.usedLLM),
      codeGenModelUsedLLM: true,
      debug: {
        decisionRationale: decisionResult.rationale,
        decisionRaw: decisionResult.raw,
        titleSummaryRaw: titleSummaryResult.raw,
        generatedCount: Object.keys(generatedContent).length,
      },
    },
  };

  console.log("🚀 [UI GEN] final adaptive payload:", {
    layout: adaptiveUI.layout,
    totalElements: adaptiveUI.totalElements,
    renderOrder: adaptiveUI.renderOrder,
    theme: adaptiveUI.theme,
  });

  return adaptiveUI;
}

// small helper
function escapeForTemplate(str: string) {
  return String(str || "").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
