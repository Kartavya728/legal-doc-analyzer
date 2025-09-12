import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseContext } from '@/lib/context-parser';
import { handleSmallTalk } from '@/lib/small-talk';
import { googleSearch } from '@/lib/google-search';

// Initialize Gemini LLM
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const llm = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
      // For chit-chat, we'll create a simple stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(chitChatReply));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 🟢 Step 2: Google Search
    const googleResults = await googleSearch(message);

    // 🟢 Step 3: Parse Context
    const ctx = parseContext(context);

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
5. Start your response immediately with the most relevant information.
`;

    // 🟢 Step 5: LLM Call with streaming
    const result = await llm.generateContentStream(prompt);
    
    // Create a text encoder
    const encoder = new TextEncoder();
    
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process each chunk as it arrives
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the stream as the response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error("❌ Chatbot Streaming API error:", err);
    return NextResponse.json(
      { error: "Chatbot streaming failed", details: err.message },
      { status: 500 }
    );
  }
}