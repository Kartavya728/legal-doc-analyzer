// src/lib/langgraph/clause-identification-agent.ts
import OpenAI from 'openai';
import { prompts } from '../langgraph/prompts';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function clauseIdentification(text: string) {
  const prompt = prompts.identify(text);

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini', // or use whichever model you have access to
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const content = resp.choices?.[0]?.message?.content || '[]';
  try {
    return JSON.parse(content) as { clause: string; start?: number; end?: number }[];
  } catch {
    // if model doesn't return JSON, attempt to extract JSON substring
    const match = content.match(/\[.*\]/s);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return []; }
    }
    return [];
  }
}
