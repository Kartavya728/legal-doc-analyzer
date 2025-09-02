// Uses AI Studio (Generative Language API) with API key in GOOGLE_GENAI_API_KEY
// Includes two helpers: generate plain text, and generate constrained JSON.

const API_KEY = process.env.GOOGLE_GENAI_API_KEY!;
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "models/gemini-1.5-flash";

async function postJSON(url: string, body: any) {
  const res = await fetch(`${url}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function googleGenerateText(system: string, user: string): Promise<string> {
  const url = `${BASE}/${MODEL}:generateContent`;
  const data = await postJSON(url, {
    contents: [
      { role: "user", parts: [{ text: `SYSTEM:\n${system}\n\nUSER:\n${user}` }] }
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
  });
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ||
    "";
  return text.trim();
}

export async function googleGenerateJSON(system: string, user: string, schemaExample: any): Promise<any> {
  const ask = `SYSTEM:\n${system}\n\nUSER:\n${user}\n\nReturn ONLY valid JSON matching this shape:\n${JSON.stringify(schemaExample)}`;
  const raw = await googleGenerateText("", ask);

  // Try to parse JSON safely (handle accidental prose)
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : "{}";
  try {
    return JSON.parse(jsonStr);
  } catch {
    return schemaExample;
  }
}
