// ./src/app/api/analyze/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises"; // Use the promise-based version of fs for async/await
import path from "path";

// FIX 1: Use ES Module 'import' instead of 'require'
// Make sure your 'call.ts' or 'call.js' file has a line like: export async function analyzeImage(...)
import { analyzeImage } from "../../../../call";

export async function POST(req: Request) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  let filePath: string | null = null; // Keep track of filePath for cleanup

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Ensure the uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Create a buffer from the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define the full path for the new file
    // It's good practice to create a unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    filePath = path.join(uploadsDir, uniqueSuffix + '-' + file.name);
    
    // Write the file to the filesystem
    await fs.writeFile(filePath, buffer);

    // Call your analysis function with the path to the saved file
    const result = await analyzeImage(filePath);

    // Return the successful analysis result
    return NextResponse.json(result);

  } catch (error: unknown) { // FIX 2: Use 'unknown' which is the type-safe version of 'any'
    console.error("API Error:", error);
    
    // FIX 3: Check the type of the error before using it
    let errorMessage = "An unknown error occurred during analysis.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  
  } finally {
    // BEST PRACTICE: Clean up the uploaded file after processing
    if (filePath) {
      try {
        await fs.unlink(filePath); // Delete the temporary file
        console.log("Successfully deleted temporary file:", filePath);
      } catch (cleanupError) {
        console.error("Failed to delete temporary file:", filePath, cleanupError);
      }
    }
  }
}