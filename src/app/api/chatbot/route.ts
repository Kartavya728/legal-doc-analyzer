import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔹 Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/* -------------------------------------------------
   1. Small-talk handler
------------------------------------------------- */
function handleSmallTalk(message: string): string | null {
  const msg = message.trim().toLowerCase();

  if (["hi", "hii", "hello"].includes(msg)) {
    return "Hey 👋, how are you doing? I'm here to help you understand your legal document better!";
  }
  if (msg.includes("thank")) {
    return "🙏 You're very welcome! I'm always happy to help clarify legal documents.";
  }
  if (msg.includes("who are you")) {
    return "🤖 I'm your AI legal assistant! I explain legal documents in plain English.";
  }
  if (msg.includes("bored")) {
    return "😅 Legal docs can be dry! Want me to highlight surprising details from your document?";
  }

  return null;
}

/* -------------------------------------------------
   2. Context Parser
------------------------------------------------- */
function parseContext(context: any) {
  if (!context) return {};
  if (typeof context === "object") return context;

  return {
    content: context,
  };
}

/* -------------------------------------------------
   3. POST Endpoint
------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🔹 Step 1: Handle chit-chat
    const chitChatReply = handleSmallTalk(message);
    if (chitChatReply) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(chitChatReply));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    // 🔹 Step 2: Build context prompt
    const ctx = parseContext(context);
    const prompt = `
You are an AI legal assistant 🤖.

--- DOCUMENT CONTEXT ---
${JSON.stringify(ctx, null, 2)}

--- USER QUESTION ---
❓ ${message}

--- RESPONSE INSTRUCTIONS ---
1. Answer clearly in 2–4 sentences
2. Blend document context if useful
3. Keep language simple & friendly
    `;

    // 🔹 Step 3: Stream Gemini response
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let heartbeat: NodeJS.Timeout | null = null;

        try {
          // Heartbeat every 15s
          heartbeat = setInterval(() => {
            controller.enqueue(encoder.encode(" "));
          }, 15000);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (err) {
          console.error("❌ Streaming Error:", err);
          controller.enqueue(
            encoder.encode("\n\n❌ Something went wrong. Please try again.")
          );
        } finally {
          if (heartbeat) clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("❌ Chatbot API Error:", err);
    return new Response("❌ Internal error", { status: 500 });
  }
}
