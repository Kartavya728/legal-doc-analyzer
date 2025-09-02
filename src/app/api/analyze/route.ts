import vision from "@google-cloud/vision";
import path from "path";

export async function POST(req) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400 }
      );
    }

    // Load service account key from root folder
    const keyPath = path.join(process.cwd(), "google-vision-key.json");

    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyPath,
    });

    const [result] = await client.textDetection(imageUrl);
    const detections = result.textAnnotations;

    const extractedText = detections.length > 0 ? detections[0].description : "";

    return new Response(
      JSON.stringify({ text: extractedText }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in Vision API:", err);
    return new Response(
      JSON.stringify({ error: "Failed to analyze document" }),
      { status: 500 }
    );
  }
}
