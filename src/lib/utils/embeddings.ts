// Build a single vector using Google AI Studio embeddings (text-embedding-004)
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.GOOGLE_GENAI_API_KEY!;
const EMB_MODEL = "models/text-embedding-004";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/${EMB_MODEL}:embedContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMB_MODEL,
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  const vec = data?.embedding?.values || data?.data?.[0]?.embedding || [];
  return vec;
}

export async function saveWithEmbedding(
  supabase: ReturnType<typeof createClient>,
  payload: {
    user_id: string;
    file_name: string;
    text: string;
    structure: any;
    category: string;
    json: any;
  }
) {
  const vector = await embedText(`${payload.text}\n${JSON.stringify(payload.json)}`);

  // documents table (json + metadata)
  const { data: doc, error: dErr } = await supabase
    .from("documents")
    .insert({
      user_id: payload.user_id,
      file_name: payload.file_name,
      original_text: payload.text,          // keep original language? we pass engText so it's English
      translated_text: payload.text,        // also store as translated
      summary: payload.json?.summary || null,
      structured: payload.json,             // JSONB column (add in schema)
      category: payload.category,
      structure: payload.structure,         // JSONB column (add in schema)
    })
    .select()
    .single();

  if (dErr) throw dErr;

  // document_embeddings table (pgvector column: embedding vector)
  const { error: eErr } = await supabase
    .from("document_embeddings")
    .insert({
      document_id: doc.id,
      embedding: vector as unknown as any, // supabase-js will map to vector
    });

  if (eErr) throw eErr;

  return doc;
}
