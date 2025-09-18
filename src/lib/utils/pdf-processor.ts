import { ImageAnnotatorClient } from '@google-cloud/vision';
import pdf from 'pdf-parse';

/**
 * Initializes and returns a Google Cloud Vision client.
 */
function getVisionClient(): ImageAnnotatorClient {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Google Cloud service account credentials (CLIENT_EMAIL, PRIVATE_KEY) are not configured in .env");
  }

  return new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
}

/**
 * Extracts text from a file buffer using the Google Cloud Vision API (OCR).
 */
async function extractTextWithGoogleOcr(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const visionClient = getVisionClient();
    const content = buffer.toString('base64');

    const request = {
      requests: [
        {
          inputConfig: {
            content: content,
            mimeType: mimeType,
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    };

    console.log(`Sending ${mimeType} to Google OCR...`);
    const [result] = await visionClient.batchAnnotateFiles(request as any);

    // --- DETAILED ERROR CHECKING & LOGGING ---
    // Log the entire response from Google to see exactly what's happening.
    console.log("Full Google OCR API Response:", JSON.stringify(result, null, 2));

    const response = result.responses?.[0];
    
    // Check if the response itself contains an error message from Google.
    if (response?.error) {
      console.error("🔴 Google OCR returned an error:", response.error.message);
      throw new Error(`Google OCR Error: ${response.error.message}`);
    }
    
    const detection = response?.fullTextAnnotation;
    
    if (detection?.text) {
        console.log("✅ Google OCR successfully extracted text.");
    } else {
        console.warn("Google OCR ran but returned no text. Check the full API response above.");
    }

    return detection?.text || "";
  } catch(error) {
    console.error("🔴 FATAL ERROR during Google OCR call:", error);
    throw error; // Re-throw the error to be caught by the main API route
  }
}

/**
 * Extracts text from a PDF buffer using the fast pdf-parse library.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.warn("Local pdf-parse failed:", error);
    return "";
  }
}

/**
 * Main processor function.
 */
export async function processDocumentText(buffer: Buffer, mimeType: string): Promise<string> {
  let extractedText = "";

  if (mimeType === "application/pdf") {
    extractedText = await extractTextFromPdf(buffer);
    if (!extractedText || extractedText.trim().length < 50) {
      console.log("Low quality PDF text detected, falling back to Google Cloud OCR...");
      extractedText = await extractTextWithGoogleOcr(buffer, mimeType);
    }
  } else if (mimeType.startsWith("image/")) {
    extractedText = await extractTextWithGoogleOcr(buffer, mimeType);
  }

  if (!extractedText) {
    console.warn("Could not extract any text from the document.");
  }

  return extractedText;
}