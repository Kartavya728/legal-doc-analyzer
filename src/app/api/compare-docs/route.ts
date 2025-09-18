// /app/api/compare-docs/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';

async function extractText(file: File): Promise<string> {
  console.log(`--- Extracting text from ${file.name} (${file.type}) ---`);
  if (file.type === 'application/pdf') {
    try {
      const fileBuffer = await file.arrayBuffer();
      const data = await pdf(Buffer.from(fileBuffer));
      console.log(`✅ Extracted ${data.numpages} page(s) from PDF.`);
      return data.text;
    } catch (error) {
      console.error("🔴 Error parsing PDF:", error);
      return "";
    }
  } else {
    console.log("✅ File is not a PDF. Reading as plain text.");
    return await file.text();
  }
}

export async function POST(request: Request) {
  console.log("\n\n--- [POST /api/compare-docs] - Request received ---");
  try {
    // --- Setup and File Extraction (same as before) ---
    if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not set');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formData = await request.formData();
    const file1 = formData.get('file1') as File | null;
    const file2 = formData.get('file2') as File | null;
    if (!file1 || !file2) return NextResponse.json({ error: 'Two files are required.' }, { status: 400 });

    const docTextA = await extractText(file1);
    const docTextB = await extractText(file2);
    if (!docTextA || !docTextB) return NextResponse.json({ error: 'Failed to extract text from files.' }, { status: 500 });
    console.log("✅ Successfully extracted text from both files.");
    
    // --- THE NEW, MORE FORCEFUL PROMPT ---
    const prompt = `
      Your single task is to act as a meticulous legal AI assistant. Compare the two documents provided and generate a JSON object that strictly follows the provided TypeScript interface. DO NOT deviate from this structure.

      **Output Schema (TypeScript Interface):**
      interface DocumentComparisonProps {
        title: string;
        docA: { title: string; clauses: string[]; };
        docB: { title: string; clauses: string[]; };
        tableComparison: Array<{ clause: string; docA: string; docB: string; status: 'identical' | 'modified' | 'added' | 'removed'; }>;
        differences: string[];
        recommendation: { recommendation: string; reason: string; preferredDoc: string; };
      }

      **Instructions for Each Field:**
      1.  **title**: Create a short, descriptive title for the comparison, using the document names.
      2.  **docA**: Set the 'title' to "Document A: ${file1.name}". For 'clauses', extract and list 3-5 main points or clauses from Document A as an array of strings.
      3.  **docB**: Set the 'title' to "Document B: ${file2.name}". For 'clauses', extract and list 3-5 main points or clauses from Document B as an array of strings.
      4.  **tableComparison**: This is critical. Compare the documents clause-by-clause or topic-by-topic. Create at least 5 entries in the array. For each entry:
          - 'clause': Name the clause or topic (e.g., "Jurisdiction", "Payment Terms").
          - 'docA': Summarize what Document A says about this clause. State 'Not Present' if it's missing.
          - 'docB': Summarize what Document B says about this clause. State 'Not Present' if it's missing.
          - 'status': Classify the comparison as 'identical', 'modified' (similar but different), 'added' (in one doc but not the other), or 'removed'.
      5.  **differences**: Based on the table, create a bullet-point style list of the most significant differences as an array of strings.
      6.  **recommendation**: Provide a final recommendation. For 'preferredDoc', state 'A' or 'B'. Justify your choice in the 'reason' field.

      **Documents to Analyze:**

      --- DOCUMENT A: ${file1.name} ---
      ${docTextA}

      --- DOCUMENT B: ${file2.name} ---
      ${docTextB}
      
      Now, generate ONLY the single JSON object that strictly follows these instructions.
    `;
    
    console.log("⏳ Sending new, more specific prompt to Gemini API...");
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    console.log("--- RAW GEMINI RESPONSE --- \n", responseText);

    const comparisonJson = JSON.parse(responseText.trim());
    console.log("✅ Successfully parsed JSON.");
    console.log("--- PARSED JSON TITLE --- \n", comparisonJson.title); // This should now have a value

    return NextResponse.json(comparisonJson);

  } catch (error) {
    console.error("\n🔴🔴🔴 FATAL ERROR in /api/compare-docs 🔴🔴🔴", error);
    return NextResponse.json({ error: 'Failed to compare documents.' }, { status: 500 });
  }
}