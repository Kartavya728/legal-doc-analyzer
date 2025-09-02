import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { buildVisionPack } from "@/lib/pipeline/vision-pipeline";
import { runLangGraph } from "@/lib/langgraph/main-langgraph"; // Corrected import name
import { createClient } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 🔐 Auth via bearer (same as before)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // save temp
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const safeName = Date.now() + "-" + file.name.replace(/[^\w.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // OCR using your existing util (kept for parity)
    const ocrResult = await processFile(filePath);

    // Build structure + English text pack (engText comes from translateText),
    // but we already have the OCR text; we can reuse translateText to keep consistent.
    const engText = await translateText(ocrResult.text, "en");
    const visionPack = await buildVisionPack(filePath, ocrResult.file || safeName);
    // Make sure engText from your translator takes precedence (better quality)
    visionPack.engText = typeof engText === "string" ? engText : Array.isArray(engText) ? engText.join(" ") : String(engText);

    // LangGraph router => final JSON
    // Corrected input parameter name to engText to match main-langgraph.ts
    const finalJson = await runLangGraph({
      engText: visionPack.engText,
      structure: visionPack.structure,
      filename: visionPack.fileName, // Assuming visionPack.fileName is correct
    });

    // Save with pgvector embedding
    const savedDoc = await saveWithEmbedding(supabase, {
      user_id: user.id,
      file_name: finalJson.filename, // Use finalJson.filename for consistency
      text: finalJson.text,
      structure: finalJson.structure,
      category: finalJson.category,
      json: finalJson,
    });

    // cleanup
    fs.unlinkSync(filePath);

    // Prepare response payload to match the Display component's expectations
    // The Display component expects data.summary, data.important_points, and data.clauses
    // We are pulling these directly from finalJson.
    const responsePayload = {
      original: ocrResult,
      translated: {
        file: finalJson.filename,
        text: finalJson.text,
        words: [],
      },
      structure: finalJson.structure,
      category: finalJson.category,
      result: finalJson, // Keep the full finalJson for debugging/other uses
      db_id: savedDoc.id,

      // Directly expose top-level fields needed by the Display component
      summary: finalJson.summary,
      important_points: finalJson.important_points || [], // Ensure it's an array, even if empty
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