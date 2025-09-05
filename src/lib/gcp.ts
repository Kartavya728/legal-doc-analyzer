// src/lib/gcp.ts
"use server";

import { ImageAnnotatorClient } from "@google-cloud/vision";
import { v2 as Translate } from "@google-cloud/translate";

/**
 * Shape of our Google Cloud clients
 */
type GcpClients = {
  imageClient: ImageAnnotatorClient;
  translateClient: InstanceType<typeof Translate.Translate>; // ✅ class type
  projectId: string;
};

/**
 * Loads Google Cloud service account credentials from env variables.
 */
function loadCredentials(): any {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let json: string | undefined;

  if (b64) {
    json = Buffer.from(b64, "base64").toString("utf8");
  } else if (raw) {
    json = raw;
  } else {
    throw new Error(
      "Missing Google service account JSON. Set GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }

  try {
    return JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON for Google service account.");
  }
}

/**
 * Initializes and returns Google Cloud clients (Vision + Translate).
 */
export const gcp: GcpClients = (() => {
  const creds = loadCredentials();
  const projectId = creds.project_id;

  const imageClient = new ImageAnnotatorClient({
    projectId,
    credentials: creds,
  });

  // ✅ Use the class inside namespace
  const translateClient = new Translate.Translate({
    projectId,
    credentials: creds,
  });

  return { imageClient, translateClient, projectId };
})();
