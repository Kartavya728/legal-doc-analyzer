// src/app/api/chatbot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  temperature: 0.3,
});

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message || !context) {
      return NextResponse.json(
        { error: "Message and context are required" },
        { status: 400 }
      );
    }

    const prompt = `
You are a legal assistant. 
The user is asking a question about the following document:

--- DOCUMENT CONTEXT ---
${context}
------------------------

User's question: ${message}

Answer in a clear and helpful way, using only information from the context above.
If the answer is not in the document, say "The document does not contain this information."
    `;

    const result = await llm.invoke(prompt);

    return NextResponse.json({
      reply: typeof result.content === "string"
        ? result.content
        : (result.content as any[]).map((c) => c.text || "").join("\n"),
    });
  } catch (err: any) {
    console.error("❌ Chatbot API error:", err);
    return NextResponse.json(
      { error: "Chatbot failed", details: err.message },
      { status: 500 }
    );
  }
}
