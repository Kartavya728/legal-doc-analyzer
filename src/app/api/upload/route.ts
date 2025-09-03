import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { buildVisionPack } from "@/lib/pipeline/vision-pipeline";
import { runLanggraph } from "@/lib/langgraph/main-langgraph"; // ✅ corrected import
import { createClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";

// 🔐 Supabase client (service role for inserts)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ must be service role
);

export async function POST(req: NextRequest) {
  try {
    // 🔐 Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // 📂 Parse multipart form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 📝 Save uploaded file locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const safeName = Date.now() + "-" + file.name.replace(/[^\w.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // 🔍 OCR extraction (Google Vision / Tesseract wrapper)
    const ocrResult = await processFile(filePath);

    // 🌍 Translate OCR text → English
    const engText = await translateText(ocrResult.text, "en");

    // 🔗 Build VisionPack (structure + filename + OCR text)
    const visionPack = await buildVisionPack(filePath, ocrResult.file || safeName);
    visionPack.engText =
      typeof engText === "string"
        ? engText
        : Array.isArray(engText)
        ? engText.join(" ")
        : String(engText);

    // 🧠 Run LangGraph pipeline
    const finalJson = await runLanggraph({
      text: visionPack.engText,
      structure: visionPack.structure,
      filename: visionPack.fileName,
      userId: user.id, // ✅ track ownership
    });

    // 📌 Title for sidebar (fallback = filename)
    const title = finalJson.title || path.parse(file.name).name;

    // 💾 Save to Supabase with vector embedding
    const savedDoc = await saveWithEmbedding(supabase, {
      table: "history", // ✅ use history, not documents
      user_id: user.id,
      file_name: finalJson.filename,
      text: finalJson.content,
      structure: finalJson.structure,
      category: finalJson.category,
      json: finalJson,
      title,
    });

    // 🧹 Cleanup local file
    fs.unlinkSync(filePath);

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
    };

    console.log("✅ FINAL JSON:", JSON.stringify(responsePayload, null, 2));

    return NextResponse.json({ result: responsePayload });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
