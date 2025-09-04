// lib/utils/embeddings.ts
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

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
  return data?.embedding?.values || [];
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
    title?: string;
  }
) {
  // 1️⃣ Create base document row
  const { data: doc, error: dErr } = await supabase
    .from("documents")
    .insert({
      user_id: payload.user_id,
      file_name: payload.file_name,
      original_text: payload.text,
      translated_text: payload.text,
      summary: payload.json?.summary || null,
      structured: payload.json,
      category: payload.category,
      structure: payload.structure,
      title: payload.title || payload.file_name,
    })
    .select()
    .single();

  if (dErr) throw dErr;

  // 2️⃣ Split text into safe chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 6000, // ~2k tokens
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(payload.text);

  // 3️⃣ Embed each chunk & save
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vector = await embedText(chunk);

    const { error: eErr } = await supabase.from("document_embeddings").insert({
      document_id: doc.id,
      chunk_index: i,
      chunk_text: chunk,
      embedding: vector as unknown as any,
    });

    if (eErr) throw eErr;
  }

  return doc;
}
