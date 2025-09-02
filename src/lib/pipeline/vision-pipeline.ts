import vision from "@google-cloud/vision";
import path from "path";
import { translateText } from "@/lib/utils/translate";

/**
 * QUICK NOTES
 * - Uses Google Vision: TEXT + LOGO + FACE to infer simple structure buckets.
 * - Heuristic “isLegal” check: looks for words common in legal docs (court, act, section, case no, FIR, charge, etc.).
 * - Produces the JSON you asked for: { engText, structure, fileName }.
 */

const keyPath = path.join(process.cwd(), "google-vision-key.json");

const client = new vision.ImageAnnotatorClient({
  keyFilename: keyPath,
});

type StructureBox = {
  label: "photo" | "logo" | "seal" | "name" | "signature" | "stamp" | "table" | "other";
  position: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  confidence?: number;
  raw?: any;
};

function regionFromCentroid(cx: number, cy: number, w: number, h: number): StructureBox["position"] {
  const x = cx / w;
  const y = cy / h;

  if (y < 0.33) {
    if (x < 0.5) return "top-left";
    return "top-right";
  } else if (y < 0.66) {
    return "center";
  } else {
    if (x < 0.5) return "bottom-left";
    return "bottom-right";
  }
}

interface IVertex {
  x?: number | null | undefined;
  y?: number | null | undefined;
}

function centroidOfVertices(verts: IVertex[]) {
  const validVerts = verts.filter(v => v.x != null && v.y != null) as { x: number; y: number }[];
  const xs = validVerts.map(v => v.x);
  const ys = validVerts.map(v => v.y);
  const cx = xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  const cy = ys.reduce((a, b) => a + b, 0) / Math.max(ys.length, 1);
  // naive width/height approx so we can normalize regions (fallback to max vertex)
  const w = Math.max(...xs, 1);
  const h = Math.max(...ys, 1);
  return { cx, cy, w, h };
}

function guessNameFromText(text: string): string | null {
  // very light heuristic—pull line that includes keywords often near a name
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const idx = lines.findIndex(l =>
    /name|applicant|accused|respondent|complainant|holder/i.test(l)
  );
  if (idx >= 0) {
    // try the same line or the next one if it looks like “Name: …”
    const line = lines[idx];
    const m = line.match(/name[:\s-]*([A-Za-z ,.'-]{3,})/i);
    if (m) return m[1].trim();
    if (lines[idx + 1]) return lines[idx + 1];
  }
  return null;
}

function quickIsLegalCheck(text: string): boolean {
  return /court|tribunal|act|section\s*\d+|ipc|crpc|fir|case\s*no\.?|charge|warrant|petition|judgment|affidavit|stamp\s*duty/i
    .test(text);
}

export async function buildVisionPack(filePath: string, fileName: string) {
  // One call with multiple features for layout signals
  const [res] = await client.annotateImage({
    image: { source: { filename: filePath } },
    features: [
      { type: "TEXT_DETECTION", maxResults: 1 },
      { type: "LOGO_DETECTION", maxResults: 5 },
      { type: "FACE_DETECTION", maxResults: 5 },
      { type: "LABEL_DETECTION", maxResults: 10 },
      // You can add OBJECT_LOCALIZATION if you’ve enabled it on your project
      // { type: "OBJECT_LOCALIZATION", maxResults: 10 },
    ],
  });

  const text = res.fullTextAnnotation?.text || res.textAnnotations?.[0]?.description || "";
  // basic structure mapping
  const structure: StructureBox[] = [];

  // faces => treat as "photo"
  (res.faceAnnotations || []).forEach(f => {
    const verts = f.boundingPoly?.vertices || [];
    const { cx, cy, w, h } = centroidOfVertices(verts);
    structure.push({
      label: "photo",
      position: regionFromCentroid(cx, cy, w, h),
      confidence: f.detectionConfidence || undefined,
      raw: { vertices: verts },
    });
  });

  // logos => "logo"
  (res.logoAnnotations || []).forEach(l => {
    const verts = l.boundingPoly?.vertices || [];
    const { cx, cy, w, h } = centroidOfVertices(verts);
    structure.push({
      label: "logo",
      position: regionFromCentroid(cx, cy, w, h),
      confidence: l.score || undefined,
      raw: { description: l.description, vertices: verts },
    });
  });

  // very small/loose heuristics for “name block”
  const guessedName = guessNameFromText(text);
  if (guessedName) {
    // names tend to appear top or center; we’ll mark as “center” if unknown
    structure.push({
      label: "name",
      position: "center",
    });
  }

  const engText = await translateText(text, "en");

  return {
    engText: typeof engText === "string" ? engText : Array.isArray(engText) ? engText.join(" ") : String(engText),
    structure,
    fileName,
    isLikelyLegal: quickIsLegalCheck(text) || quickIsLegalCheck(String(engText)),
  };
}
