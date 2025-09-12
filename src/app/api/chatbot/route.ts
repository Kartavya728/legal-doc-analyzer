import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔹 Initialize Gemini LLM
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/* -------------------------------------------------
   1. Small-talk / Chit-chat handler
------------------------------------------------- */
function handleSmallTalk(message: string): string | null {
  const msg = message.trim().toLowerCase();

  if (["hi", "hii", "hello"].includes(msg)) {
    return "Hey 👋, how are you doing? I'm here to help you understand your legal document better!";
  }
  if (msg.includes("thank")) {
    return "🙏 You're very welcome! I'm always happy to help clarify legal documents and answer your questions.";
  }
  if (msg.includes("who are you")) {
    return "🤖 I'm your AI legal assistant! I explain legal documents in plain English and can fetch the latest information from the web.";
  }
  if (msg.includes("bored")) {
    return "😅 I get it—legal docs can be dry! Want me to highlight surprising or important details from your document?";
  }
  if (msg.includes("not asking about document")) {
    return "👍 No worries! I'm happy to chat about anything. What's on your mind?";
  }

  return null;
}

/* -------------------------------------------------
   2. Google Search Helper
------------------------------------------------- */
async function googleSearch(query: string): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return "🔍 Search unavailable (API keys missing).";
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "3");
    url.searchParams.set("safe", "active");

    const res = await fetch(url.toString());
    if (!res.ok) return "🔍 Couldn’t fetch search results.";

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return "🔍 No relevant results found.";
    }

    return data.items
      .slice(0, 3)
      .map(
        (item: any) =>
          `📌 ${item.title}\n${item.snippet}\n🔗 ${item.link}`
      )
      .join("\n\n");
  } catch (err) {
    console.error("❌ Google Search Error:", err);
    return "🔍 Search temporarily unavailable.";
  }
}

/* -------------------------------------------------
   3. Context Parser
------------------------------------------------- */
function parseContext(context: any) {
  if (!context) return {};

  if (typeof context === "object") {
    return {
      category: context.category ?? "",
      title: context.title ?? "",
      summary: context.summary ?? "",
      importantPoints: context.importantPoints ?? [],
      risks: context.risks ?? "",
      note: context.note ?? "",
      texts: context.texts?.slice(0, 3) ?? [],
    };
  }

  if (typeof context === "string") {
    return {
      category: (context.match(/Category:\s*(.*)/)?.[1] ?? "").trim(),
      title: (context.match(/Title:\s*(.*)/)?.[1] ?? "").trim(),
      summary: (
        context.match(
          /Summary:\s*([\s\S]*?)(?:Important Points:|Risks:|$)/
        )?.[1] ?? ""
      ).trim(),
      importantPoints: (context.match(
        /Important Points:\s*([\s\S]*?)(?:Risks:|Note:|$)/
      )?.[1] ?? "")
        .split(/,\s*|\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      risks: (context.match(/Risks:\s*([\s\S]*?)(?:Note:|$)/)?.[1] ?? "").trim(),
      note: (context.match(/Note:\s*([\s\S]*)$/)?.[1] ?? "").trim(),
    };
  }

  return {};
}

/* -------------------------------------------------
   4. POST Endpoint (Main Handler)
------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message || !context) {
      return new Response(
        JSON.stringify({ error: "❌ Message and context are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 1: Handle small talk first
    const chitChatReply = handleSmallTalk(message);
    if (chitChatReply) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          let i = 0;
          const typeOut = () => {
            if (i < chitChatReply.length) {
              controller.enqueue(encoder.encode(chitChatReply[i]));
              i++;
              setTimeout(typeOut, 30);
            } else {
              controller.close();
            }
          };
          typeOut();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Step 2: Perform Google Search
    const searchQuery = `${message} legal document analysis`;
    const googleResults = await googleSearch(searchQuery);

    // Step 3: Parse context
    const ctx = parseContext(context);

    // Step 4: Build Prompt
    const prompt = `
You are an expert AI legal assistant 🤖 with deep knowledge of legal documents and procedures.

--- DOCUMENT CONTEXT ---
📋 Category: ${ctx.category}
📑 Title: ${ctx.title}
📝 Summary: ${ctx.summary}
🎯 Key Points: ${ctx.importantPoints.join(", ")}
⚠️ Risks: ${ctx.risks}
📌 Important Note: ${ctx.note}
------------------------

--- CURRENT WEB INFORMATION ---
${googleResults}
------------------------

--- USER QUESTION ---
❓ ${message}
------------------------

--- RESPONSE INSTRUCTIONS ---
1. 🎯 Start by directly answering the user’s question
2. 🔄 Blend in context + web info naturally
3. 📏 Keep it short (2–4 sentences unless asked for detail)
4. 💬 Conversational tone with light emojis
5. 📚 Simplify legal terms
6. 💡 Offer practical next steps if relevant
    `;

    // Step 5: Stream Gemini response
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              for (let i = 0; i < text.length; i++) {
                controller.enqueue(encoder.encode(text[i]));
                if (i < text.length - 1) {
                  await new Promise((r) => setTimeout(r, 20));
                }
              }
            }
          }
          controller.close();
        } catch (err) {
          console.error("❌ Streaming Error:", err);
          controller.enqueue(
            encoder.encode(
              "\n\n❌ Oops, something went wrong while processing your request."
            )
          );
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
    console.error("❌ API Error:", err);

    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            "❌ I'm having technical issues right now. Please try again later."
          )
        );
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
