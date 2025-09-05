// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processFile, processFileBuffer } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { runLanggraph } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import path from "path";

// ✅ Ensure Node.js runtime (required for buffer handling)
export const runtime = "nodejs";

function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const supabase = getAdminSupabase();

  try {
    // 🔐 Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // 📂 Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 📦 Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const ext = path.extname(file.name).toLowerCase();

    // 🔍 OCR extraction
    let ocrResult;
    if (ext === ".pdf") {
      // PDFs → must go through GCS pipeline
      ocrResult = await processFile(safeName); // safeName used in GCS
    } else {
      // Images → use buffer directly
      ocrResult = await processFileBuffer(buffer, safeName);
    }

    // 🌍 Translate OCR text → English
    const engTextRaw = await translateText(ocrResult.text, "en");
    const engText =
      typeof engTextRaw === "string"
        ? engTextRaw
        : Array.isArray(engTextRaw)
        ? engTextRaw.join(" ")
        : String(engTextRaw ?? "");

    // 🚫 Skip Vision pipeline (temporary speed test)
    const visionPack = {
      fileName: ocrResult.file || safeName,
      structure: [], // empty for now
      engText,
    };

    // 🧠 Run LangGraph pipeline
    const finalJson = (await runLanggraph({
      text: engText,
      structure: visionPack.structure,
      filename: visionPack.fileName,
    })) as any;

    // 📌 Title
    const title =
      finalJson.title ||
      path.parse(file.name).name ||
      path.parse(visionPack.fileName || safeName).name;

    // 💾 Save to Supabase
    const savedDoc = await saveWithEmbedding(supabase, {
      user_id: user.id,
      file_name: finalJson.filename,
      text: finalJson.content,
      structure: finalJson.structure,
      category: finalJson.category,
      json: {
        ...finalJson,
        chat_history: [],
      },
      title,
    });

    const responsePayload = {
      original: ocrResult,
      translated: {
        file: finalJson.filename,
        text: finalJson.content,
      },
      structure: finalJson.structure,
      category: finalJson.category,
      result: finalJson,
      db_id: savedDoc.id,
      title,
      summary: finalJson.summary,
      important_points: finalJson.important_points || [],
      clauses: finalJson.clauses || [],
      chat_history: [],
    };

    return NextResponse.json({ result: responsePayload });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
