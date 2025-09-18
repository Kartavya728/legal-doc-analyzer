import { NextResponse } from 'next/server';
import { pipeline, Pipeline } from '@xenova/transformers';
import pdf from 'pdf-parse';

// Helper function to extract text from a file
async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const fileBuffer = await file.arrayBuffer();
    const data = await pdf(Buffer.from(fileBuffer));
    return data.text;
  }
  return await file.text();
}

// --- Singleton Pattern for a SPECIALIZED Summarization Model ---
// This model is highly reliable for one task: summarizing.
class SummarizationPipeline {
  static task = 'summarization';
  static model = 'Xenova/distilbart-cnn-6-6';
  static instance: Pipeline | null = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      console.log("Initializing local summarization model...");
      this.instance = await pipeline(this.task, this.model, { progress_callback });
      console.log("Local model initialized successfully.");
    }
    return this.instance;
  }
}

export async function POST(request: Request) {
  console.log("\n\n--- [POST /api/safe-analysis] - Request received ---");
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    
    const documentText = await extractText(file);
    if (!documentText) return NextResponse.json({ error: 'Failed to extract text.' }, { status: 500 });
    
    // Step 1: Get the initialized local summarization model
    const summarizer = await SummarizationPipeline.getInstance();
    
    console.log("⏳ Performing safe analysis (summarization)...");
    
    // Step 2: Generate a high-quality summary from the document text
    const output = await summarizer(documentText.substring(0, 10000), {
        max_length: 250,
        min_length: 50,
    });
    
    const summaryText = Array.isArray(output) ? output[0].summary_text : 'Could not generate summary.';
    console.log("--- GENERATED SUMMARY --- \n", summaryText);

    // Step 3: Programmatically create key points from the summary
    // This is a robust way to ensure we always have data for the KeyPoints component.
    const importantPoints = summaryText
        .match(/[^.!?]+[.!?]+/g) // Split the summary into sentences
        ?.slice(0, 4) // Take the first 4 sentences
        ?.map(point => point.trim()) || ["Summary was too short to extract key points."]; // Fallback

    // Step 4: Construct the final response object to match what Display.tsx expects
    const finalResponse = {
      summary: {
        summaryText: summaryText,
        importantPoints: importantPoints,
      },
      fullText: documentText, // For the chatbot context
    };
    
    console.log("✅ Analysis complete. Sending structured data to frontend.");
    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("\n🔴🔴🔴 FATAL ERROR in /api/safe-analysis 🔴🔴🔴", error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}