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
import { searchGoogle } from "./google-search"; // adjust path to your helper
// If you have a runLanggraph wrapper you prefer, you can call it instead for decision/codegen flows.
// import { runLanggraph } from "@/lib/langgraph/main-langgraph";

type CategoryTheme = Record<string, string>;

// ---------- Types (kept similar to your previous file) ----------
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

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY, // ✅ correct env var
  temperature: 0.15,
  streaming: false,
});

// Streaming LLM instance for real-time UI generation
const streamingLlm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY,
  temperature: 0.15,
  streaming: true,
});

/* ---------------------------
   LLM CALL WRAPPER
   returns the raw string (content) from Gemini
---------------------------- */
async function callLLM(prompt: string): Promise<string> {
  const res = await llm.invoke(prompt);
  // result may have structure; using .content as earlier usage
  if (typeof res.content === "string") return res.content;
  // fallback stringify
  return JSON.stringify(res.content || res, null, 2);
}

/* ===========================
   1) Title & Summary Updater
   - Normalize or create a concise title (4-8 words)
   - Create a short summary (1-2 sentences) used for the summary card
   - Return { title, shortSummary, recommendedChatQuestions[] }
   These run in parallel with decision+component generation.
=========================== */
async function updateTitleAndSummary(input: UIGeneratorInput) {
  // Offer rich prompt with context; ask for JSON.
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
  // fallback behavior
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
   2) Decision Model
   - Decide which components to include and for what purpose
   - Must return 3-6 components, at least 3.
   - Must not include Images component unless clearly needed
   - Ensure at least two components have distinct content purposes
   - Output returned as JSON { components: [ UIComponentSpec ], rationale: string }
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

  // Prefer to call a specialized codeflow via runLanggraph if available.
  // But we'll call Gemini directly (callLLM).
  let outRaw: string;
  try {
    outRaw = await callLLM(prompt);
  } catch (err) {
    outRaw = "";
    console.warn("Decision model LLM call failed:", err);
  }

  let parsed = parseJsonSafe(outRaw);
  if (!parsed || !Array.isArray(parsed?.components)) {
    // Fallback heuristic generation (guarantee 3 components)
    const comps: UIComponentSpec[] = [];

    // 1) Summary card
    comps.push({
      id: uuid("summary-"),
      kind: "card",
      title: "Executive Summary",
      description: "Concise summary card for main takeaways.",
      dataState: { kind: "none", sample: [] },
      priority: "high",
    });

    // 2) If keyDates present => timeline + table
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
      // Also add a table of items
      comps.push({
        id: uuid("table-"),
        kind: "table",
        title: "Milestones Table",
        description: "Tabular listing of dates and descriptions.",
        dataState: { kind: "tabular", sample: keyDates.slice(0, 30) },
        priority: "medium",
      });
    } else if (Array.isArray(skills) && skills.length > 0) {
      // show skills table + highlights grid
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
      // default: summary + table + dropdown
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

    const rationale = `Fallback heuristic chosen based on presence of keyDates=${(keyDates || []).length} skills=${(skills || []).length}.`;
    parsed = { components: comps, rationale };
  }

  // post-process: ensure at least 3 components and no identical content purpose
  let components: UIComponentSpec[] = parsed.components.slice(0, 6);
  // ensure unique titles
  const seenTitles = new Set<string>();
  components = components.filter((c) => {
    if (!c.title) return false;
    if (seenTitles.has(c.title.trim().toLowerCase())) return false;
    seenTitles.add(c.title.trim().toLowerCase());
    return true;
  });

  // enforce at least 3
  if (components.length < 3) {
    // add fallback summary and dropdowns
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

  // decide whether images component is allowed
  const hasImagesInData = Array.isArray(input.jsonData?.images) && input.jsonData.images.length > 0;
  const includesImages = components.some((c) => c.kind === "images");
  if (includesImages && !hasImagesInData) {
    // remove images if not supported
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
   - For each component spec create structured content expected by each React component
   - Runs in parallel and yields { id, spec, content }
   - For websearch component we call searchGoogle to fetch results
   - Images component only produced if data indicates
=========================== */
async function generateComponentContent(spec: UIComponentSpec, input: UIGeneratorInput) {
  // dispatch by kind
  const jsonData = input.jsonData || {};
  const sampleData = input.sampleData || [];

  // Base prompt templates per kind (detailed)
  async function runLLMForComponent(prompt: string) {
    try {
      const out = await callLLM(prompt);
      const parsed = parseJsonSafe(out);
      // if parse fails, return raw text as fallback
      return parsed ?? { text: out.trim() };
    } catch (err) {
      return { text: `LLM error: ${String(err)}` };
    }
  }

  switch (spec.kind) {
    case "card": {
      // Use summary or important points
      const prompt = `
You are writing content for a "Summary Card" UI component.
Input summary/object:
${safeStringify(input.summary || jsonData || {})}

Return JSON:
{ "title": "${spec.title}", "body": "1-2 short sentences", "bullets": ["short bullet 1","short bullet 2"] }
`;
      const content = await runLLMForComponent(prompt);
      return { id: spec.id, spec, content };
    }

    case "table": {
      // aim to produce rows / columns
      // If spec provides sample, use that; else derive from jsonData keys
      let sample = spec.dataState?.sample ?? sampleData;
      if (!Array.isArray(sample) || sample.length === 0) {
        // build a sample from jsonData fields
        const fallbackRows: any[] = [];
        if (Array.isArray(jsonData?.projects)) {
          for (const p of (jsonData.projects as any[]).slice(0, 10)) {
            fallbackRows.push(p);
          }
        } else if (Array.isArray(jsonData?.keyDates)) {
          for (const d of (jsonData.keyDates as any[]).slice(0, 20)) fallbackRows.push(d);
        } else if (Array.isArray(jsonData?.skills)) {
          (jsonData.skills as any[]).slice(0, 20).forEach((s, i) => fallbackRows.push({ id: i + 1, skill: s }));
        }
        sample = fallbackRows;
      }

      // If still empty, ask LLM to create a compact sample
      if (!Array.isArray(sample) || sample.length === 0) {
        const prompt = `
Create up to 6 example rows for a table titled "${spec.title}" based on this summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array of objects.
`;
        const rows = await runLLMForComponent(prompt);
        sample = Array.isArray(rows) ? rows : [];
      }

      // Determine columns automatically
      const columns =
        spec.dataState?.columns ??
        (Array.isArray(sample) && sample.length > 0 ? Object.keys(sample[0]).map((k) => ({ key: k, label: k })) : []);

      return { id: spec.id, spec, content: { columns, rows: sample } };
    }

    case "timeline":
    case "flowchart": {
      // Use keyDates or derive events from summary
      let events = jsonData?.keyDates ?? input.summary?.keyDates ?? [];
      if (!Array.isArray(events) || events.length === 0) {
        // ask LLM to generate timeline events from summary
        const prompt = `
You are a timeline extractor. Based on this summary produce 4-8 timeline events:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "date":"YYYY-MM-DD", "title":"", "description":"" }]
`;
        const out = await runLLMForComponent(prompt);
        events = Array.isArray(out) ? out : [];
      }

      return { id: spec.id, spec, content: { events } };
    }

    case "grid": {
      // Grid of highlights or cards
      let cards = spec.dataState?.sample ?? input.summary?.importantPoints ?? jsonData?.highlights ?? [];
      if (!Array.isArray(cards) || cards.length === 0) {
        const prompt = `
Create 6 short highlight cards (title & one-line subtitle) for the document summary:
${safeStringify(input.summary || jsonData || {})}
Return JSON array: [{ "title":"", "subtitle":"" }]
`;
        const out = await runLLMForComponent(prompt);
        cards = Array.isArray(out) ? out : [];
      }

      return { id: spec.id, spec, content: { cards } };
    }

    case "dropdown":
    case "selector": {
      const options = spec.dataState?.sample ?? ["Summary", "Detailed", "Risks", "Clauses"];
      return { id: spec.id, spec, content: { options } };
    }

    case "chart": {
      // placeholder: return dataset summary
      let dataset = spec.dataState?.sample ?? sampleData ?? jsonData?.amounts ?? [];
      if (!Array.isArray(dataset) || dataset.length === 0) {
        // request small synthetic dataset
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
      // call searchGoogle if available
      const q = spec.props?.query || input.title || (input.summary && (input.summary.summaryText || input.summary));
      let results = [];
      try {
        if (typeof searchGoogle === "function" && q) {
          results = await searchGoogle(String(q));
          // normalize
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
      // Only allowed if input.jsonData.images present
      const images = Array.isArray(jsonData?.images) ? jsonData.images : [];
      return { id: spec.id, spec, content: { images } };
    }

    default: {
      // generic text component
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
   Top-level function: generateAdaptiveUI
   - orchestrates the 3 parallel tasks
   - returns AdaptiveUIPayload
=========================== */
export async function generateAdaptiveUI(input: UIGeneratorInput): Promise<AdaptiveUIPayload> {
  // print raw input for debug
  console.log("📥 [UI GEN] starting with input:", safeStringify(input).slice(0, 2000));

  const theme = getCategoryTheme(input.category);

  // Run three major tasks in parallel:
  // A) Title & short summary update
  // B) Decision model to choose components
  // C) (deferred) component content generation once components known
  const [titleSummaryResult, decisionResult] = await Promise.all([
    updateTitleAndSummary(input),
    decideComponents(input),
  ]);

  // ensure unique components at least 3
  const decidedComponents: UIComponentSpec[] = decisionResult.components.map((c) => {
    // normalize id if missing
    if (!c.id) c.id = uuid("comp-");
    return c;
  });

  // Guarantee at least 3 components
  if (decidedComponents.length < 3) {
    // add fallback summary and dropdowns
    decidedComponents.push({
      id: uuid("summary-"),
      kind: "card",
      title: "Executive Summary",
      description: "Concise summary of the document.",
      dataState: { kind: "none", sample: [] },
      priority: "high",
    });
  }

  // Avoid duplicate kinds/titles — dedupe by title lowercased
  const uniqueByTitle: UIComponentSpec[] = [];
  const seen = new Set<string>();
  for (const c of decidedComponents) {
    const key = (c.title || c.kind || c.id).toString().trim().toLowerCase();
    if (!seen.has(key)) {
      uniqueByTitle.push(c);
      seen.add(key);
    }
  }

  // Decide whether to include images component: only if input.jsonData.images present OR decision said images and jsonData has images
  const hasImagesData = Array.isArray(input.jsonData?.images) && input.jsonData.images.length > 0;
  const finalComponents = uniqueByTitle.filter((c) => {
    if (c.kind === "images" && !hasImagesData) return false;
    return true;
  });

  // Ensure at least 3 now
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

  // Now generate contents for each component in parallel
  const genPromises = finalComponents.map((spec) => generateComponentContent(spec, input));
  const settled = await Promise.allSettled(genPromises);

  // build generatedContent map
  const generatedContent: AdaptiveUIPayload["generatedContent"] = {};
  settled.forEach((s, idx) => {
    const spec = finalComponents[idx];
    if (s.status === "fulfilled") {
      generatedContent[spec.id] = { spec, content: s.value.content ?? s.value };
    } else {
      generatedContent[spec.id] = {
        spec,
        content: { error: String((s as PromiseRejectedResult).reason) },
      };
    }
  });

  // Enforce that at least 2 components have distinct content
  // We'll check serialized content strings for uniqueness
  const contentSigs = Object.values(generatedContent).map((g) => safeStringify(g.content).slice(0, 2000));
  const uniqueSigs = new Set(contentSigs);
  if (uniqueSigs.size < Math.min(2, contentSigs.length)) {
    // Force re-generation for the second component with a more prescriptive prompt
    const keys = Object.keys(generatedContent);
    if (keys.length >= 2) {
      const secondKey = keys[1];
      const spec = generatedContent[secondKey].spec;
      // regenerate with a stricter prompt
      const regen = await generateComponentContent(spec, input);
      generatedContent[secondKey] = { spec: regen.spec, content: regen.content };
    }
  }

  // Convert component specs into UIElement entries for adaptive UI
  const elementsArray: UIElement[] = finalComponents.map((c) => {
    const type: UIElement["type"] =
      c.kind === "chart" || c.kind === "timeline" || c.kind === "flowchart" || c.kind === "images"
        ? "visual"
        : c.kind === "table"
        ? "data"
        : "interactive";
    const layout: UIElement["layout"] =
      c.kind === "chart" || c.kind === "flowchart" || c.kind === "timeline" ? "split" : c.kind === "grid" ? "grid" : "stack";
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
    const p = { high: 0, medium: 1, low: 2 } as any;
    return p[a.priority] - p[b.priority];
  });

  // Simple generatedCode fallback (small react component that maps content to components)
  const generatedCode = `// Auto-generated UI component (fallback)
import React from "react";
export default function GeneratedUI({ dataState = {} }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      ${sorted
        .map(
          (el) => `<section key="${el.id}" style={{ padding: 12, borderRadius: 8 }}>
  <h3>${el.title}</h3>
  <pre style={{ whiteSpace: "pre-wrap" }}>${escapeForTemplate(
    safeStringify(generatedContent[el.id]?.content || el.content)
  )}</pre>
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
    metadata: {
      generatedAt: new Date().toISOString(),
      category: input.category,
      complexity: sorted.length > 6 ? "high" : sorted.length > 3 ? "medium" : "low",
      hasInteractiveElements: sorted.some((el) => el.type === "interactive"),
      hasVisualElements: sorted.some((el) => el.type === "visual"),
      decisionModelUsedLLM: !!decisionResult.usedLLM,
      codeGenModelUsedLLM: true,
      debug: {
        decisionRationale: decisionResult.rationale,
        decisionRaw: decisionResult.raw,
        titleSummaryRaw: titleSummaryResult.raw,
        generatedCount: Object.keys(generatedContent).length,
      },
    },
  };
  // debug summary log
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