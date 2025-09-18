import { NextRequest, NextResponse } from "next/server";
import { streamEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import { translateText } from "@/lib/utils/translate";
import path from "path";
// Import the Google Cloud Vision client
import { ImageAnnotatorClient } from '@google-cloud/vision';

export const runtime = "nodejs";
export const maxDuration = 300;

// --- OCR TOOL: SELF-CONTAINED HELPERS ---

/**
 * Initializes and returns a Google Cloud Vision client authenticated via a service account.
 */
function getVisionClient(): ImageAnnotatorClient {
  // The private key from the .env file needs to have its newline characters correctly formatted.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Google Cloud service account credentials (CLIENT_EMAIL, PRIVATE_KEY) are not configured in your .env file.");
  }

  return new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
}

/**
 * Extracts text from a file buffer using the correct Google Cloud Vision API method based on file type.
 */
async function extractTextWithGoogleOcr(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const visionClient = getVisionClient();
    const content = buffer.toString('base64');
    let result: any;

    console.log(`Sending ${mimeType} file to Google OCR for extraction...`);

    // Use the correct API method based on the file's MIME type.
    if (mimeType === 'application/pdf' || mimeType === 'image/gif' || mimeType === 'image/tiff') {
      // Use batchAnnotateFiles for supported document types
      const request = {
        requests: [{
          inputConfig: { content: content, mimeType: mimeType },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      };
      [result] = await visionClient.batchAnnotateFiles(request as any);
    } else if (mimeType.startsWith('image/')) {
      // Use batchAnnotateImages for common image types like PNG, JPEG, WEBP
      const request = {
        requests: [{
          image: { content: content },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      };
      [result] = await visionClient.batchAnnotateImages(request as any);
    } else {
      throw new Error(`Unsupported MIME type for Google OCR: ${mimeType}`);
    }

    console.log("Full Google OCR API Response received.");

    const response = result.responses?.[0];
    if (response?.error) {
      throw new Error(`Google OCR Error: ${response.error.message}`);
    }
    
    const detection = response?.fullTextAnnotation;
    if (detection?.text) {
        console.log("✅ Google OCR successfully extracted text.");
    } else {
        console.warn("Google OCR ran but returned no text.");
    }

    return detection?.text || "";
  } catch(error) {
    console.error("🔴 FATAL ERROR during Google OCR call:", error);
    // Re-throw the error so it can be caught by the main handler
    throw error;
  }
}

// --- SUPABASE HELPER ---

function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey);
}

// --- MAIN API ROUTE ---

export async function POST(req: NextRequest) {
  const supabase = getAdminSupabase();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (!user || userError) return new Response(JSON.stringify({ error: "Invalid user" }), { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const safeEnqueue = (data: any, isRaw = false) => {
          try {
            controller.enqueue(isRaw ? data : encoder.encode(JSON.stringify(data) + "\n"));
          } catch (e) {
            // This can happen if the client disconnects, it's safe to ignore.
            console.warn("Stream enqueue failed, client might have disconnected.");
          }
        };

        try {
          safeEnqueue({ status: "uploading", message: "Processing file..." });

          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

          let extractedText: string = "";
          safeEnqueue({ status: "extracting", message: "Extracting text with Google OCR..." });
          
          if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
            extractedText = await extractTextWithGoogleOcr(buffer, file.type);
          } else {
            throw new Error(`Unsupported file type: ${file.type}`);
          }
          
          if (!extractedText) {
             throw new Error("OCR could not extract any text from the document. The document might be blank or corrupted.");
          }

          safeEnqueue({ status: "translating", message: "Translating content..." });
          const englishText = await translateText(extractedText, "en");
          const finalText = Array.isArray(englishText) ? englishText.join(" ") : String(englishText ?? "");

          safeEnqueue({ status: "analyzing", message: "Starting AI analysis..." });
          const aiStream = await streamEnhancedLanggraphWorkflow(user.id, safeName, finalText);
          const reader = aiStream.body?.getReader();
          if (!reader) throw new Error("Failed to get AI reader");

          let finalAiResult: any = null;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                safeEnqueue(value, true);
                try {
                    const chunkStr = new TextDecoder().decode(value);
                    const lines = chunkStr.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const potentialResult = JSON.parse(line.replace('data: ', ''));
                            if (potentialResult.event === 'on_chain_end' && potentialResult.data?.output) {
                               finalAiResult = potentialResult.data.output;
                            }
                        }
                    }
                  } catch {}
            }
          }

          safeEnqueue({ status: "saving", message: "Saving document..." });
          const savedDoc = await saveWithEmbedding(supabase, {
            user_id: user.id,
            file_name: safeName,
            text: finalText,
            category: finalAiResult?.category || "General",
            json: finalAiResult || { filename: safeName, text: finalText, chat_history: [] },
            title: finalAiResult?.title || safeName
          });

          safeEnqueue({ 
            status: "complete", 
            message: "Done!", 
            result: { ...finalAiResult, db_id: savedDoc.id, fullText: finalText } 
          });

        } catch (error: any) {
          safeEnqueue({ status: "error", message: error.message || String(error) });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown" }), { status: 500 });
  }
}