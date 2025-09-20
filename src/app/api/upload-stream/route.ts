import { NextRequest } from "next/server";
import { streamEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import { translateText } from "@/lib/utils/translate";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export const runtime = "nodejs";
export const maxDuration = 300;

// --- OCR TOOL: SELF-CONTAINED HELPERS ---

/**
 * Initializes and returns a Google Cloud Vision client authenticated via a service account.
 */
function getVisionClient(): ImageAnnotatorClient {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error(
      "Google Cloud service account credentials (CLIENT_EMAIL, PRIVATE_KEY) are not configured in your .env file."
    );
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
 * Extracts text from a file buffer using Google Cloud Vision OCR.
 */
async function extractTextWithGoogleOcr(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const visionClient = getVisionClient();
    const content = buffer.toString("base64");
    let result: any;

    console.log(`Sending ${mimeType} file to Google OCR for extraction...`);

    if (
      mimeType === "application/pdf" ||
      mimeType === "image/gif" ||
      mimeType === "image/tiff"
    ) {
      // Use batchAnnotateFiles for documents
      const request = {
        requests: [
          {
            inputConfig: { content: content, mimeType: mimeType },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      };
      [result] = await visionClient.batchAnnotateFiles(request as any);
      // batchAnnotateFiles nesting is different
      const fileResponse = result.responses?.[0]?.responses?.[0];
      if (fileResponse?.error) {
        throw new Error(`Google OCR Error: ${fileResponse.error.message}`);
      }
      const detection = fileResponse?.fullTextAnnotation;
      if (detection?.text) {
        console.log("✅ Google OCR extracted text (PDF/TIFF/GIF).");
        return detection.text;
      }
    } else if (mimeType.startsWith("image/")) {
      // Use batchAnnotateImages for PNG, JPEG, WEBP
      const request = {
        requests: [
          {
            image: { content: content },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      };
      [result] = await visionClient.batchAnnotateImages(request as any);
      const response = result.responses?.[0];
      if (response?.error) {
        throw new Error(`Google OCR Error: ${response.error.message}`);
      }
      const detection = response?.fullTextAnnotation;
      if (detection?.text) {
        console.log("✅ Google OCR extracted text (Image).");
        return detection.text;
      }
    } else {
      throw new Error(`Unsupported MIME type for Google OCR: ${mimeType}`);
    }

    console.warn("Google OCR ran but returned no text.");
    return "";
  } catch (error) {
    console.error("🔴 OCR ERROR:", error);
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const token = authHeader.slice(7).trim();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (!user || userError)
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
      });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
      });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const safeEnqueue = (data: any, isRaw = false) => {
          try {
            controller.enqueue(
              isRaw ? data : encoder.encode(JSON.stringify(data) + "\n")
            );
          } catch {
            console.warn(
              "Stream enqueue failed, client might have disconnected."
            );
          }
        };

        try {
          safeEnqueue({
            status: "uploading",
            message: "Processing file...",
          });

          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = `${Date.now()}-${file.name.replace(
            /[^\w.-]/g,
            "_"
          )}`;

          safeEnqueue({
            status: "extracting",
            message: "Extracting text with Google OCR...",
          });
          const extractedText = await extractTextWithGoogleOcr(
            buffer,
            file.type
          );

          if (!extractedText.trim()) {
            throw new Error(
              "OCR could not extract any text. Document might be blank or corrupted."
            );
          }

          safeEnqueue({
            status: "translating",
            message: "Translating content...",
          });
          const englishText = await translateText(extractedText, "en");
          const finalText = Array.isArray(englishText)
            ? englishText.join(" ")
            : String(englishText ?? "");

          safeEnqueue({
            status: "analyzing",
            message: "Starting AI analysis...",
          });
          const aiStream = await streamEnhancedLanggraphWorkflow(
            user.id,
            safeName,
            finalText
          );
          const reader = aiStream.body?.getReader();
          if (!reader) throw new Error("Failed to get AI reader");

          let finalAiResult: any = null;
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              safeEnqueue(value, true);
              try {
                const chunkStr = decoder.decode(value);
                const lines = chunkStr.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const potentialResult = JSON.parse(
                      line.replace("data: ", "")
                    );
                    if (
                      potentialResult.event === "on_chain_end" &&
                      potentialResult.data?.output
                    ) {
                      finalAiResult = potentialResult.data.output;
                    }
                  }
                }
              } catch {}
            }
          }

          safeEnqueue({
            status: "saving",
            message: "Saving document...",
          });
          const savedDoc = await saveWithEmbedding(supabase, {
            user_id: user.id,
            file_name: safeName,
            text: finalText,
            category: finalAiResult?.category || "General",
            json:
              finalAiResult || {
                filename: safeName,
                text: finalText,
                chat_history: [],
              },
            title: finalAiResult?.title || safeName,
          });

          safeEnqueue({
            status: "complete",
            message: "Done!",
            result: {
              ...finalAiResult,
              db_id: savedDoc.id,
              fullText: finalText,
            },
          });
        } catch (error: any) {
          safeEnqueue({
            status: "error",
            message: error.message || String(error),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown" }), {
      status: 500,
    });
  }
}
