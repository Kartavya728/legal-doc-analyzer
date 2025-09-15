// src/app/api/upload-stream/route.ts
import { NextRequest } from "next/server";
import { processDocumentText } from "@/lib/utils/pdf-processor";
import { translateText } from "@/lib/utils/translate";
import { streamEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for Vercel

function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const supabase = getAdminSupabase();

  try {
    // 🔑 Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 📄 Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 🔄 Create a stream for progress + analysis output
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const safeEnqueue = (data: any, isRaw = false) => {
          try {
            if (isRaw) {
              controller.enqueue(data);
            } else {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            }
          } catch (err) {
            console.warn("Attempted enqueue after close:", err);
          }
        };

        try {
          // Step 1: Initial status
          safeEnqueue({ status: "uploading", message: "Processing file..." });

          // Step 2: Read file buffer
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = path.extname(file.name).toLowerCase();
          const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

          safeEnqueue({ status: "extracting", message: "Extracting text from document..." });

          let extractedText: string;
          if (ext === ".pdf") {
            extractedText = await processDocumentText(buffer, "pdf");
          } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
            extractedText = await processDocumentText(buffer, "image");
          } else {
            safeEnqueue({ status: "error", message: "Unsupported file type" });
            return;
          }

          // Step 3: Translate text
          safeEnqueue({ status: "translating", message: "Translating content if needed..." });

          const englishText = await translateText(extractedText, "en");
          const finalText =
            typeof englishText === "string"
              ? englishText
              : Array.isArray(englishText)
              ? englishText.join(" ")
              : String(englishText ?? "");

          // Step 4: Stream analysis from LangGraph
          safeEnqueue({ status: "analyzing", message: "Starting document analysis..." });

          const streamingResponse = await streamEnhancedLanggraphWorkflow(
            user.id,
            safeName,
            finalText
          );

          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error("Failed to get stream reader");
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) safeEnqueue(value, true); // forward raw model bytes
          }

          // Step 5: Save to database
          safeEnqueue({ status: "saving", message: "Saving document to database..." });

          const savedDoc = await saveWithEmbedding(supabase, {
            user_id: user.id,
            file_name: safeName,
            text: finalText,
            category: "Processing", // update later
            json: {
              filename: safeName,
              text: finalText,
              chat_history: []
            },
            title: safeName
          });

          // Step 6: Completion
          safeEnqueue({
            status: "complete",
            message: "Processing complete",
            db_id: savedDoc.id
          });
        } catch (error) {
          console.error("Streaming error:", error);
          safeEnqueue({
            status: "error",
            message: "An error occurred during processing",
            error: String(error)
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
