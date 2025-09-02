// src/lib/langgraph/prompts.ts
export const prompts = {
  identify: (text: string) => `
You are a legal text splitter. Extract logically independent clauses or sentences from the provided English text.
Return ONLY valid JSON: an array of objects:
[{"clause":"...", "start": <start_index>, "end": <end_index>}]

Text:
${text}
`.trim(),

  categorize: (clausesJson: any) => `
You are a legal clause categorizer. Given a JSON array of clauses, assign each clause one of these categories:
[Jurisdiction, Payment, Confidentiality, Termination, Liability, IP, Warranty, DisputeResolution, Privacy, Indemnity, Misc]

Return ONLY valid JSON array of objects:
[{"clause":"...","category":"..."}]

Clauses:
${JSON.stringify(clausesJson).slice(0, 12000)}
`.trim()
};
