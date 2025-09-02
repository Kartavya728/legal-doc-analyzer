import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "@/lib/utils/file-processing";
import { translateText } from "@/lib/utils/translate";
import { generateSummary } from "@/lib/langgraph/main-langgraph";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeName = Date.now() + "-" + file.name.replace(/[^\w.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const ocrResult = await processFile(filePath);

    const translatedText = await translateText(ocrResult.text, "en");
    const translatedWords = await translateText(ocrResult.words, "en");

    const summary = await generateSummary(translatedText as string);

    const fullResult = {
      original: ocrResult,
      translated: {
        file: ocrResult.file,
        text: translatedText,
        words: translatedWords,
      },
      summary,
    };

    fs.unlinkSync(filePath);

    return NextResponse.json({ result: fullResult });
  } catch (error: any) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        stack: error.stack || null,
      },
      { status: 500 }
    );
  }
}
