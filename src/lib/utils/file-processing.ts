import vision from "@google-cloud/vision";
import fs from "fs";
import path from "path";


// Always resolve relative to project root
const keyPath = path.join(process.cwd(), "google-vision-key.json");

const client = new vision.ImageAnnotatorClient({
  keyFilename: keyPath,
});

export async function extractTextFromImage(filePath: string) {
  const [result] = await client.textDetection(filePath);
  const detections = result.textAnnotations;
  return detections && detections.length > 0 ? detections[0].description : "";
}
export async function processFile(filePath: string): Promise<any> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Send image to Google Vision API
    const [result] = await client.textDetection(filePath);

    if (!result || !result.textAnnotations) {
      throw new Error("No text annotations returned by Vision API.");
    }

    // Extract text
    const detections = result.textAnnotations.map((annotation) => annotation.description);
    return {
      file: path.basename(filePath),
      text: detections[0] || "", // first element usually contains full text
      words: detections.slice(1), // remaining are per-word detections
    };
  } catch (error: any) {
    console.error("Error processing file:", error.message);
    throw error;
  }
}
