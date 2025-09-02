import path from "path";
import vision from "@google-cloud/vision";
import { v2 as Translate } from "@google-cloud/translate";

type GcpClients = {
  imageClient: vision.ImageAnnotatorClient;
  translateClient: InstanceType<typeof Translate.Translate>;
  projectId: string;
};

function loadCredentials(): any {
  // Prefer base64 env var to avoid newlines issues in env files
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

export const gcp: GcpClients = (() => {
  const creds = loadCredentials();
  const projectId = creds.project_id;

  const imageClient = new vision.ImageAnnotatorClient({
    projectId,
    credentials: creds,
  });

  const translateClient = new Translate.Translate({
    projectId,
    credentials: creds,
  });

  return { imageClient, translateClient, projectId };
})();
