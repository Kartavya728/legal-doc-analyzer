import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { processFile } from "../../../lib/utils/file-processing";  

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Ensure uploads dir exists
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file locally
    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    // Process file with Google Vision
    const result = await processFile(filePath);

    // Clean up (optional)
    fs.unlinkSync(filePath);

    console.log("OCR Result:", result); // ✅ Print in terminal

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
