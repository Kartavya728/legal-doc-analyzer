import { TranslationServiceClient } from "@google-cloud/translate";
import fs from "fs";
import path from "path";

// Always resolve relative to project root
const keyPath = path.join(process.cwd(), "google-vision-key.json");

// Load projectId directly from the JSON key file
const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
const projectId = keyFile.project_id;

const location = "global"; // or "us-central1" for advanced models

const client = new TranslationServiceClient({
  keyFilename: keyPath,
});

/**
 * Translate text or array of texts into a target language
 * @param textToTranslate Single string or array of strings
 * @param targetLanguageCode Language code (default: "en")
 * @returns Translated string or array of strings
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
    parent: `projects/${projectId}/locations/${location}`,
    contents,
    targetLanguageCode,
  };

  try {
    const [response] = await client.translateText(request);
    const translations = response.translations?.map((t) => t.translatedText || "") || [];

    return isArray ? translations : translations[0];
  } catch (error: any) {
    console.error("Error translating text:", error);
    throw new Error(error.message || "Translation API call failed");
  }
}
