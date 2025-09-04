// pages/api/chatbot.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ⚖️ Main LLM
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro", // better for reasoning than flash
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
  temperature: 0.7,
  maxOutputTokens: 800,
});

// 🔎 Google Search (Serper API)
async function googleSearch(query: string) {
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

    console.log("🔎 Raw Google search:", JSON.stringify(data, null, 2));

    const formatted = (data?.organic ?? [])
      .slice(0, 3)
      .map((r: any) => `- ${r.title}: ${r.snippet} (🔗 ${r.link})`)
      .join("\n");

    console.log("✅ Cleaned Google results:\n", formatted);
    return formatted || "No results.";
  } catch (err) {
    console.error("❌ Google search failed:", err);
    return "⚠️ Google search failed.";
  }
}

// 🎭 Detect whether it's small-talk or informational
async function detectSmallTalk(query: string): Promise<boolean> {
  const detectorPrompt = `
Classify the query as "small-talk" or "informational".

Small-talk = greetings (hi, hello, hii), thanks, asking who you are, "I am bored", "let's chat", casual chatter.
Informational = anything that asks about laws, legal meaning, FIR, sections, case details, or general facts.

Only return "small-talk" or "informational".

Query: "${query}"
`;

  const reply = await llm.invoke([{ role: "user", content: detectorPrompt }]);

  const output =
    typeof reply.content === "string"
      ? reply.content.toLowerCase()
      : Array.isArray(reply.content)
      ? reply.content.map((c: any) => c?.text ?? "").join("").toLowerCase()
      : "";

  console.log("🧭 Classification:", output);
  return output.includes("small-talk");
}

// 🎭 Handle small-talk replies
async function generateSmallTalkResponse(query: string): Promise<string> {
  const prompt = `
The user said: "${query}".

This is a friendly / casual small-talk.
Reply in a conversational, natural style with light emojis.
Do NOT mention legal documents, do NOT reference "document context".
Just act like a friendly assistant.
`;

  const reply = await llm.invoke([{ role: "user", content: prompt }]);

  return typeof reply.content === "string"
    ? reply.content
    : Array.isArray(reply.content)
    ? reply.content.map((c: any) => c?.text ?? "").join("")
    : "👋 Hi there!";
}

// 🎯 Main handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  // Step 1: Classify query
  const isSmallTalk = await detectSmallTalk(message);

  if (isSmallTalk) {
    console.log("🗨️ Small-talk detected:", message);
    const reply = await generateSmallTalkResponse(message);
    return res.status(200).json({ reply });
  }

  // Step 2: For info queries → Search Google
  const searchResults = await googleSearch(message);
   console.log("✅ Cleaned Google results:\n", searchResults);

  // Step 3: Blend context + Google
  const systemPrompt = `
You are a funny AI assistant specialized in joking bot. 
`;

  const userPrompt = `
User query: "${message}"


🌍 Google Search Results:
${searchResults}
`;

  const reply = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const answer =
    typeof reply.content === "string"
      ? reply.content
      : Array.isArray(reply.content)
      ? reply.content.map((c: any) => c?.text ?? "").join("")
      : "⚠️ No response generated.";

  res.status(200).json({ reply: answer });
}
