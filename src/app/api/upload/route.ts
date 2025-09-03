// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { buildVisionPack } from "@/lib/pipeline/vision-pipeline";
import { runLangGraph } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 🔐 Auth via bearer
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

    // 📂 Get uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Save file locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const safeName = Date.now() + "-" + file.name.replace(/[^\w.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // 📝 OCR (Vision API)
    const ocrResult = await processFile(filePath);

    // 🌍 Translate text
    const engText = await translateText(ocrResult.text, "en");

    // 🔗 Build vision pack
    const visionPack = await buildVisionPack(filePath, ocrResult.file || safeName);
    visionPack.engText =
      typeof engText === "string"
        ? engText
        : Array.isArray(engText)
        ? engText.join(" ")
        : String(engText);

    // 🧠 Run LangGraph
    const finalJson = await runLangGraph({
      engText: visionPack.engText,
      structure: visionPack.structure,
      filename: visionPack.fileName,
    });

    // ✅ Title for sidebar (fallback = file name)
    const title = finalJson.title || path.parse(file.name).name;

    // 💾 Save in DB with embeddings (→ history table now)
    const savedDoc = await saveWithEmbedding(supabase, {
      table: "history", // 👈 target table
      user_id: user.id,
      file_name: finalJson.filename,
      text: finalJson.text,
      structure: finalJson.structure,
      category: finalJson.category,
      json: finalJson,
      title,
    });

    // 🧹 Cleanup local file
    fs.unlinkSync(filePath);

    // 📦 Response payload
    const responsePayload = {
      original: ocrResult,
      translated: {
        file: finalJson.filename,
        text: finalJson.text,
        words: [],
      },
      structure: finalJson.structure,
      category: finalJson.category,
      result: finalJson,
      db_id: savedDoc.id,
      title,
      summary: finalJson.summary,
      important_points: finalJson.important_points || [],
      clauses: finalJson.clauses,
    };

    console.log("✅ FINAL JSON:", JSON.stringify(responsePayload, null, 2));

    return NextResponse.json({ result: responsePayload });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
