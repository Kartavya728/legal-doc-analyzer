// src/app/api/chatbot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Gemini LLM
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.5,
});

// --- 1. Small-talk & chit-chat detection ---
function handleSmallTalk(message: string): string | null {
  const msg = message.trim().toLowerCase();

  if (["hi", "hii", "hello"].includes(msg)) {
    return "Hey 👋, how are you doing?";
  }
  if (msg.includes("thank")) {
    return "🙏 You're welcome! Always happy to help.";
  }
  if (msg.includes("who are you")) {
    return "🤖 I’m your AI legal assistant — I explain documents in plain English and fetch fresh info from the web 🌍.";
  }
  if (msg.includes("bored")) {
    return "😅 I get it, legal docs can be boring! Want me to share some quirky or unexpected details from this one?";
  }
  if (msg.includes("not asking about document")) {
    return "No worries 👍, we can just chat casually too! Ask me anything.";
  }
  return null;
}

// --- 2. Google Search Helper ---
async function googleSearch(query: string): Promise<string> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "in", hl: "en", num: 5 }),
    });

    const data = await res.json();

    console.log("🔎 [RAW GOOGLE SEARCH DATA]:", JSON.stringify(data, null, 2));

    const formatted = (data?.organic ?? [])
      .slice(0, 3)
      .map((r: any) => `- ${r.title}: ${r.snippet} (🔗 ${r.link})`)
      .join("\n");

    console.log("✅ [FORMATTED GOOGLE RESULTS]:\n", formatted);

    return formatted || "No results found.";
  } catch (err) {
    console.error("❌ Google search failed:", err);
    return "⚠️ Google search failed.";
  }
}

// --- 3. Context Parser (handles both object + string) ---
function parseContext(context: any) {
  if (!context) return {};

  if (typeof context === "object") {
    return {
      category: context?.category ?? "",
      title: context?.title ?? "",
      summary: context?.summary ?? "",
      importantPoints: context?.importantPoints ?? [],
      risks: context?.risks ?? "",
      note: context?.note ?? "",
      texts: context?.texts?.slice(0, 3) ?? [],
    };
  }

  if (typeof context === "string") {
    return {
      category: (context.match(/Category:\s*(.*)/)?.[1] ?? "").trim(),
      title: (context.match(/Title:\s*(.*)/)?.[1] ?? "").trim(),
      summary: (context.match(/Summary:\s*([\s\S]*?)(?:Important Points:|Risks:|$)/)?.[1] ?? "").trim(),
      importantPoints: (context.match(/Important Points:\s*([\s\S]*?)(?:Risks:|Note:|$)/)?.[1] ?? "")
        .split(/,\s*|\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      risks: (context.match(/Risks:\s*([\s\S]*?)(?:Note:|$)/)?.[1] ?? "").trim(),
      note: (context.match(/Note:\s*([\s\S]*)$/)?.[1] ?? "").trim(),
    };
  }

  return {};
}

// --- 4. Main API Handler ---
export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message || !context) {
      return NextResponse.json(
        { error: "Message and context are required" },
        { status: 400 }
      );
    }

    // 🟢 Step 1: Check chit-chat
    const chitChatReply = handleSmallTalk(message);
    if (chitChatReply) {
      return NextResponse.json({ reply: chitChatReply });
    }

    // 🟢 Step 2: Google Search
    const googleResults = await googleSearch(message);

    // 🟢 Step 3: Parse Context
    const ctx = parseContext(context);
    console.log("📘 [CLEANED CONTEXT]:", JSON.stringify(ctx, null, 2));

    // 🟢 Step 4: Build Prompt
    const prompt = `
You are a friendly AI assistant 🤖 specializing in explaining legal documents.

--- DOCUMENT CONTEXT ---
Category: ${ctx.category}
Title: ${ctx.title}
Summary: ${ctx.summary}
Important Points: ${ctx.importantPoints.join(", ")}
Risks: ${ctx.risks}
Note: ${ctx.note}
------------------------

--- GOOGLE SEARCH RESULTS ---
${googleResults}
------------------------

--- USER MESSAGE ---
${message}
------------------------

--- INSTRUCTIONS ---
1. Always merge Document Context + Google Results.
2. Never say "document does not contain this". Use Google if doc is missing info.
3. Keep answers short: 2–4 sentences by default. Expand only if user asks for detail.
4. Be clear, simple, and conversational. Add natural emojis where fitting.
`;

    console.log("📝 [FINAL PROMPT SENT TO GEMINI]:", prompt);

    // 🟢 Step 5: LLM Call
    const result = await llm.invoke(prompt);

    const reply =
      typeof result.content === "string"
        ? result.content
        : (result.content as any[]).map((c) => c.text || "").join("\n").trim();

    return NextResponse.json({ reply: reply || "No answer generated." });
  } catch (err: any) {
    console.error("❌ Chatbot API error:", err);
    return NextResponse.json(
      { error: "Chatbot failed", details: err.message },
      { status: 500 }
    );
  }
}
