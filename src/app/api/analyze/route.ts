import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const { analyzeImage } = require("../../../../call");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Ensure uploads folder exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadsDir, file.name);
    fs.writeFileSync(filePath, buffer);

    // Call Python
    const result = await analyzeImage(filePath);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.toString() }, { status: 500 });
  }
}
