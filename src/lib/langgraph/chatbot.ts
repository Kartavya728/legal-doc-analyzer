import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
  temperature: 0.3,
});

export async function runChatbot({
  query,
  context,
}: {
  query: string;
  context: any;
}): Promise<string> {
  const systemPrompt = `
You are a helpful AI assistant specialized in analyzing and explaining legal documents.

Document context provided:
- Category: ${context?.category || "Unknown"}
- Title: ${context?.title || "Untitled"}
- Summary: ${JSON.stringify(context?.summary || {}, null, 2)}
- Important Points: ${JSON.stringify(context?.importantPoints || [], null, 2)}
- Clauses: ${JSON.stringify(context?.clauses || [], null, 2)}
- Risks & Consequences: ${context?.mainRisksRightsConsequences || ""}
- What Happens If Ignored: ${context?.whatHappensIfYouIgnoreThis || ""}
- What You Should Do Now: ${JSON.stringify(context?.whatYouShouldDoNow || [], null, 2)}
- Important Note: ${context?.importantNote || ""}

Answer the user's query clearly, concisely, and in plain English.
If the answer is not found in the context, say: "This information is not available in the document."
  `;

  const res = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: query },
  ]);

  let output = "";

  if (typeof res.content === "string") {
    output = res.content;
  } else if (Array.isArray(res.content)) {
    output = res.content
      .map((c) => ("text" in c ? c.text : ""))
      .join("\n")
      .trim();
  }

  return output || "No answer generated.";
}
