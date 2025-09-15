// src/app/api/upload-stream/route.ts
import { NextRequest } from "next/server";
import { processDocumentText } from "@/lib/utils/pdf-processor";
import { translateText } from "@/lib/utils/translate";
import { streamEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import path from "path";
// Remove unused import since we're using native Response

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
    // Auth check
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create a stream to send progress updates
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "uploading", 
            message: "Processing file..."
          }) + "\n"));

          // Process file based on type
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = path.extname(file.name).toLowerCase();
          const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "extracting", 
            message: "Extracting text from document..."
          }) + "\n"));

          let extractedText: string;
          
          if (ext === ".pdf") {
            extractedText = await processDocumentText(buffer, "pdf");
          } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
            extractedText = await processDocumentText(buffer, "image");
          } else {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              status: "error", 
              message: "Unsupported file type"
            }) + "\n"));
            controller.close();
            return;
          }

          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "translating", 
            message: "Translating content if needed..."
          }) + "\n"));

          // Translate to English if needed
          const englishText = await translateText(extractedText, "en");
          const finalText = typeof englishText === "string" ? englishText : 
                          Array.isArray(englishText) ? englishText.join(" ") : 
                          String(englishText ?? "");

          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "analyzing", 
            message: "Starting document analysis..."
          }) + "\n"));

          // Use the streaming workflow
          const streamingResponse = await streamEnhancedLanggraphWorkflow(
            user.id,
            safeName,
            finalText
          );

          // Get the readable stream from the streaming response
          const reader = streamingResponse.body?.getReader();
          if (!reader) {
            throw new Error("Failed to get stream reader");
          }

          // Forward the streaming response
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          // Save to database after processing is complete
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "saving", 
            message: "Saving document to database..."
          }) + "\n"));

          // We need to create a basic document record
          // The complete data will be updated later when we have the full result
          const savedDoc = await saveWithEmbedding(supabase, {
            user_id: user.id,
            file_name: safeName,
            text: finalText,
            category: "Processing", // Will be updated with actual category
            json: {
              filename: safeName,
              text: finalText,
              chat_history: [],
            },
            title: safeName,
          });

          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "complete", 
            message: "Processing complete",
            db_id: savedDoc.id
          }) + "\n"));

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            status: "error", 
            message: "An error occurred during processing",
            error: String(error)
          }) + "\n"));
          controller.close();
        }
      }
    });

    // Use native Response instead of StreamingTextResponse due to compatibility issues
     return new Response(stream, {
       headers: {
         'Content-Type': 'text/plain; charset=utf-8'
       }
     });
  } catch (error: any) {
    console.error("Upload error:", error);
    // Use native Response for error handling
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}