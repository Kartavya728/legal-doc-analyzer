// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { buildVisionPack } from "@/lib/pipeline/vision-pipeline";
import { runLanggraph } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";

// ✅ Ensure Node.js runtime (required for fs/path)
export const runtime = "nodejs";

// 🔐 local factory (NOT exported) to avoid Next.js type check failures
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
  // Create inside handler so nothing is exported
  const supabase = getAdminSupabase();

  let filePath: string | null = null;

  try {
    // 🔐 Auth check (expects: Authorization: Bearer <jwt>)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    // Get user from JWT (server-side with service role is allowed)
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

    // 📝 Save uploaded file locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // 🔍 OCR extraction
    const ocrResult = await processFile(filePath);

    // 🌍 Translate OCR text → English
    const engTextRaw = await translateText(ocrResult.text, "en");
    const engText =
      typeof engTextRaw === "string"
        ? engTextRaw
        : Array.isArray(engTextRaw)
        ? engTextRaw.join(" ")
        : String(engTextRaw ?? "");

    // 🔗 Build VisionPack
    const visionPack = await buildVisionPack(
      filePath,
      ocrResult.file || safeName
    );

    // attach the normalized English text
    (visionPack as any).engText = engText;

    // 🧠 Run LangGraph pipeline
    const finalJson = (await runLanggraph({
      text: engText,
      structure: visionPack.structure,
      filename: visionPack.fileName,
    })) as any;

    // 📌 Title for sidebar (fallback = filename w/o extension)
    const title =
      finalJson.title ||
      path.parse(file.name).name ||
      path.parse(visionPack.fileName || safeName).name;

    // 💾 Save to Supabase with vector embedding + init chat_history
    // NOTE: Your comment said "use history, not documents" but your code uses "documents".
    // Keep the table name consistent with your DB schema.
    const savedDoc = await saveWithEmbedding(supabase, {
      user_id: user.id,
      file_name: finalJson.filename,
      text: finalJson.content,
      structure: finalJson.structure,
      category: finalJson.category,
      json: {
        ...finalJson,
        chat_history: [], // initialize chat history
      },
      title,
    });

    // 📦 Construct detailed response
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

    // 🧹 Cleanup local file
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup failures
    }

    return NextResponse.json({ result: responsePayload });
  } catch (error: any) {
    // attempt cleanup on error
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup failures
    }

    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
