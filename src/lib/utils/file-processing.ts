// lib/utils/file-processing.ts
import { ImageAnnotatorClient, protos } from "@google-cloud/vision";
import { LROperation } from "google-gax";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

// 🔑 Validate required env vars
if (
  !process.env.GOOGLE_PROJECT_ID ||
  !process.env.GOOGLE_CLIENT_EMAIL ||
  !process.env.GOOGLE_PRIVATE_KEY
) {
  throw new Error(
    "❌ Missing Google Cloud environment variables (GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)"
  );
}

// ✅ Initialize Google Vision client with env vars
const visionClient = new ImageAnnotatorClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

// ✅ Initialize Google Storage client with env vars
const storageClient = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

// Buckets
const GCS_INPUT_BUCKET = process.env.GCS_INPUT_BUCKET || "your-ocr-input-bucket";
const GCS_OUTPUT_BUCKET = process.env.GCS_OUTPUT_BUCKET || "your-ocr-output-bucket";

// 📤 Upload file to GCS
async function uploadFileToGCS(
  localFilePath: string,
  bucketName: string,
  destinationFileName: string
): Promise<string> {
  const bucket = storageClient.bucket(bucketName);
  await bucket.upload(localFilePath, { destination: destinationFileName, resumable: false });
  console.log(`✅ Uploaded ${localFilePath} → gs://${bucketName}/${destinationFileName}`);
  return `gs://${bucketName}/${destinationFileName}`;
}

// 🗑️ Delete file from GCS
async function deleteFileFromGCS(bucketName: string, fileName: string): Promise<void> {
  const bucket = storageClient.bucket(bucketName);
  await bucket.file(fileName).delete();
  console.log(`🗑️ Deleted gs://${bucketName}/${fileName}`);
}

// 📥 Read JSON output from GCS
async function readJsonFromGCS(bucketName: string, prefix: string): Promise<any[]> {
  console.log(`📥 Fetching JSON results from gs://${bucketName}/${prefix} ...`);
  const [files] = await storageClient.bucket(bucketName).getFiles({ prefix });
  const results: any[] = [];

  for (const file of files) {
    if (file.name.endsWith(".json")) {
      const [content] = await file.download();
      console.log(`   ↳ Downloaded ${file.name}`);
      results.push(JSON.parse(content.toString("utf8")));
    }
  }

  console.log(`📄 Retrieved ${results.length} JSON result files.`);
  return results;
}

// 🚀 OCR from local file path (used for PDFs or dev env)
export async function processFile(filePath: string): Promise<any> {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName).toLowerCase();
  const isPdf = fileExtension === ".pdf";

  let gcsInputUri: string | null = null;
  let ocrResultText = "";
  let ocrResultWords: string[] = [];

  try {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    if (isPdf) {
      console.log(`🚀 Starting PDF OCR for ${fileName}`);

      // Upload
      const gcsDestinationFileName = `input/${fileName}`;
      gcsInputUri = await uploadFileToGCS(filePath, GCS_INPUT_BUCKET, gcsDestinationFileName);

      // Destination
      const gcsOutputPrefix = `output/${fileName}_output/`;
      const gcsOutputUri = `gs://${GCS_OUTPUT_BUCKET}/${gcsOutputPrefix}`;

      const request: protos.google.cloud.vision.v1.IAsyncBatchAnnotateFilesRequest = {
        requests: [
          {
            inputConfig: { gcsSource: { uri: gcsInputUri }, mimeType: "application/pdf" },
            features: [{ type: protos.google.cloud.vision.v1.Feature.Type.DOCUMENT_TEXT_DETECTION }],
            outputConfig: { gcsDestination: { uri: gcsOutputUri }, batchSize: 20 },
          },
        ],
      };

      console.log(`📤 Sending async OCR request → ${gcsInputUri}`);
      const [operation] = (await visionClient.asyncBatchAnnotateFiles(request)) as unknown as [
        LROperation<
          protos.google.cloud.vision.v1.IAsyncBatchAnnotateFilesResponse,
          protos.google.cloud.vision.v1.IOperationMetadata
        >
      ];

      console.log("⏳ OCR operation started. Waiting for completion...");
      await operation.promise();
      console.log("✅ OCR operation completed.");

      // Download results
      const jsonResults = await readJsonFromGCS(GCS_OUTPUT_BUCKET, gcsOutputPrefix);

      // Aggregate
      let pageCounter = 1;
      for (const res of jsonResults) {
        if (res.responses) {
          for (const page of res.responses) {
            if (page.fullTextAnnotation) {
              console.log(`📖 Processing page ${pageCounter}`);
              ocrResultText += `\n\n--- Page ${pageCounter} ---\n${page.fullTextAnnotation.text}`;
              if (page.textAnnotations) {
                ocrResultWords = ocrResultWords.concat(
                  page.textAnnotations
                    .slice(1)
                    .map((w: any) => w.description ?? "")
                    .filter(Boolean)
                );
              }
            }
            pageCounter++;
          }
        }
      }

      console.log(`📊 Finished processing ${pageCounter - 1} pages.`);
    } else {
      console.log(`🖼️ Starting Image OCR for ${fileName}`);
      const [result] = await visionClient.textDetection(filePath);

      if (!result?.textAnnotations?.length) {
        console.warn(`⚠️ No text detected in ${fileName}`);
      } else {
        ocrResultText = result.textAnnotations[0].description || "";
        ocrResultWords = result.textAnnotations
          .slice(1)
          .map((a) => a.description)
          .filter((w): w is string => !!w);
        console.log(`✅ Extracted text from image: ${ocrResultWords.length} words`);
      }
    }

    return { file: fileName, text: ocrResultText.trim(), words: ocrResultWords };
  } catch (err: any) {
    console.error("❌ Error processing file:", err.message);
    throw err;
  } finally {
    if (gcsInputUri) {
      const gcsFileName = gcsInputUri.split("/").slice(3).join("/");
      await deleteFileFromGCS(GCS_INPUT_BUCKET, gcsFileName).catch(console.error);
    }
  }
}

// 🚀 OCR directly from buffer (serverless safe, no /uploads/)
export async function processFileBuffer(buffer: Buffer, fileName: string): Promise<any> {
  let ocrResultText = "";
  let ocrResultWords: string[] = [];

  try {
    console.log(`🖼️ Starting Buffer OCR for ${fileName}`);
    const [result] = await visionClient.textDetection({ image: { content: buffer } });

    if (!result?.textAnnotations?.length) {
      console.warn(`⚠️ No text detected in buffer for ${fileName}`);
    } else {
      ocrResultText = result.textAnnotations[0].description || "";
      ocrResultWords = result.textAnnotations
        .slice(1)
        .map((a) => a.description)
        .filter((w): w is string => !!w);
      console.log(`✅ Extracted text from buffer: ${ocrResultWords.length} words`);
    }

    return { file: fileName, text: ocrResultText.trim(), words: ocrResultWords };
  } catch (err: any) {
    console.error("❌ Error processing buffer:", err.message);
    throw err;
  }
}