import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// These clients will automatically use the GOOGLE_APPLICATION_CREDENTIALS
// from the .env.local file.
export const storage = new Storage({
    projectId: process.env.GOOGLE_PROJECT_ID,
});
export const visionClient = new ImageAnnotatorClient();

export const bucketName = process.env.GCLOUD_STORAGE_BUCKET as string;

if (!bucketName) {
    throw new Error("GCLOUD_STORAGE_BUCKET environment variable not set.");
}