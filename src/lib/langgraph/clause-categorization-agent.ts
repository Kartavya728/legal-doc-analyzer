// src/lib/langgraph/clause-categorization-agent.ts
import OpenAI from 'openai';
import { prompts } from '../langgraph/prompts';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function clauseCategorization(clauses: { clause: string }[]) {
  const prompt = prompts.categorize(clauses);

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const content = resp.choices?.[0]?.message?.content || '[]';
  try {
    return JSON.parse(content) as { clause: string; category: string }[];
  } catch {
    const match = content.match(/\[.*\]/s);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return []; }
    }
    return [];
  }
}
