// lib/utils/file-processing.ts
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

// Always resolve relative to project root
const keyPath = path.join(process.cwd(), "google-vision-key.json");

// Initialize Google Cloud clients
const visionClient = new ImageAnnotatorClient({
  keyFilename: keyPath,
});
const storageClient = new Storage({
  keyFilename: keyPath,
});

// Configuration for GCS buckets
const GCS_INPUT_BUCKET =
  process.env.GCS_INPUT_BUCKET || "your-ocr-input-bucket";
const GCS_OUTPUT_BUCKET =
  process.env.GCS_OUTPUT_BUCKET || "your-ocr-output-bucket";

// Utility to upload a local file to GCS
async function uploadFileToGCS(
  localFilePath: string,
  bucketName: string,
  destinationFileName: string
): Promise<string> {
  const bucket = storageClient.bucket(bucketName);
  await bucket.upload(localFilePath, {
    destination: destinationFileName,
    resumable: false,
  });
  console.log(`Uploaded ${localFilePath} to gs://${bucketName}/${destinationFileName}`);
  return `gs://${bucketName}/${destinationFileName}`;
}

// Utility to delete a file from GCS
async function deleteFileFromGCS(
  bucketName: string,
  fileName: string
): Promise<void> {
  const bucket = storageClient.bucket(bucketName);
  await bucket.file(fileName).delete();
  console.log(`Deleted gs://${bucketName}/${fileName}`);
}

// Utility to read JSON files from GCS (for OCR results)
async function readJsonFromGCS(
  bucketName: string,
  prefix: string
): Promise<any[]> {
  const [files] = await storageClient.bucket(bucketName).getFiles({ prefix });
  const results: any[] = [];
  for (const file of files) {
    if (file.name.endsWith(".json")) {
      const [content] = await file.download();
      results.push(JSON.parse(content.toString("utf8")));
    }
  }
  return results;
}

export async function processFile(filePath: string): Promise<any> {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName).toLowerCase();
  const isPdf = fileExtension === ".pdf";

  let gcsInputUri: string | null = null;
  let ocrResultText = "";
  let ocrResultWords: string[] = [];

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (isPdf) {
      // --- PDF Processing Flow (via GCS) ---
      const gcsDestinationFileName = `input/${fileName}`;
      gcsInputUri = await uploadFileToGCS(
        filePath,
        GCS_INPUT_BUCKET,
        gcsDestinationFileName
      );

      const gcsOutputPrefix = `output/${fileName}_output/`;
      const gcsOutputUri = `gs://${GCS_OUTPUT_BUCKET}/${gcsOutputPrefix}`;

      const request = {
        requests: [
          {
            inputConfig: {
              gcsSource: { uri: gcsInputUri },
              mimeType: "application/pdf",
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            outputConfig: {
              gcsDestination: { uri: gcsOutputUri },
              batchSize: 20, // split every 20 pages
            },
          },
        ],
      };

      console.log(`Starting async PDF OCR for ${gcsInputUri}`);
      const [operation] = await visionClient.asyncBatchAnnotateFiles(request);
      await operation.promise(); // Wait for completion
      console.log(`PDF OCR completed for ${gcsInputUri}`);

      // Read results from the output GCS bucket
      const jsonResults = await readJsonFromGCS(
        GCS_OUTPUT_BUCKET,
        gcsOutputPrefix
      );

      // Aggregate text and words from all pages
      let pageCounter = 1;
      for (const res of jsonResults) {
        if (res.responses && res.responses.length > 0) {
          for (const page of res.responses) {
            if (page.fullTextAnnotation) {
              ocrResultText += `\n\n--- Page ${pageCounter} ---\n${page.fullTextAnnotation.text}`;
              if (page.textAnnotations) {
                ocrResultWords = ocrResultWords.concat(
                  page.textAnnotations
                    .slice(1)
                    .map((annotation: any) => annotation.description)
                );
              }
            }
            pageCounter++;
          }
        }
      }
    } else {
      // --- Image Processing Flow (direct) ---
      const [result] = await visionClient.textDetection(filePath);

      if (!result || !result.textAnnotations || result.textAnnotations.length === 0) {
        console.warn(`No text annotations returned by Vision API for image: ${fileName}.`);
        ocrResultText = "";
        ocrResultWords = [];
      } else {
        ocrResultText = result.textAnnotations[0].description || "";
        ocrResultWords = result.textAnnotations
          .slice(1)
          .map((annotation) => annotation.description);
      }
    }

    return {
      file: fileName,
      text: ocrResultText.trim(),
      words: ocrResultWords,
    };
  } catch (error: any) {
    console.error("Error processing file:", error.message);
    throw error;
  } finally {
    // Cleanup: Delete the input file from GCS if it was uploaded
    if (gcsInputUri) {
      const gcsFileName = gcsInputUri.split("/").slice(3).join("/");
      await deleteFileFromGCS(GCS_INPUT_BUCKET, gcsFileName).catch(console.error);
    }
    // Also delete the output folder from GCS
    if (isPdf) {
      const gcsOutputPrefix = `output/${fileName}_output/`;
      const [files] = await storageClient
        .bucket(GCS_OUTPUT_BUCKET)
        .getFiles({ prefix: gcsOutputPrefix });
      await Promise.all(files.map((f) => f.delete())).catch(console.error);
      console.log(`Cleaned up output folder gs://${GCS_OUTPUT_BUCKET}/${gcsOutputPrefix}`);
    }
  }
}
