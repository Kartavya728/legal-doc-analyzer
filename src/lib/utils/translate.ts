// lib/utils/translate.ts
import { TranslationServiceClient } from "@google-cloud/translate";

// 🔑 Validate required env vars
if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  throw new Error("❌ Missing Google Cloud environment variables (GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)");
}

const location = "global"; // or "us-central1" if needed

// ✅ Use env vars for credentials
const client = new TranslationServiceClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

/**
 * Translate text or array of texts into a target language
 */
export async function translateText(
  textToTranslate: string | string[],
  targetLanguageCode: string = "en"
): Promise<string | string[]> {
  if (!textToTranslate || (Array.isArray(textToTranslate) && textToTranslate.length === 0)) {
    return textToTranslate;
  }

  const isArray = Array.isArray(textToTranslate);
  const contents = isArray ? textToTranslate : [textToTranslate];

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${location}`,
    contents,
    targetLanguageCode,
  };

  try {
    const [response] = await client.translateText(request);
    const translations = response.translations?.map((t) => t.translatedText || "") || [];

    return isArray ? translations : translations[0];
  } catch (error: any) {
    console.error("❌ Error translating text:", error);
    throw new Error(error.message || "Translation API call failed");
  }
}
