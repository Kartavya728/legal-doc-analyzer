// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processDocumentText } from "@/lib/utils/pdf-processor";
import { translateText } from "@/lib/utils/translate";
import { runEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { saveWithEmbedding } from "@/lib/utils/embeddings";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for Vercel

function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const supabase = getAdminSupabase();

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.slice("Bearer ".length).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Process file based on type
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase();
    const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

    let extractedText: string;
    
    if (ext === ".pdf") {
      extractedText = await processDocumentText(buffer, "pdf");
    } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      extractedText = await processDocumentText(buffer, "image");
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Translate to English if needed
    const englishText = await translateText(extractedText, "en");
    const finalText = typeof englishText === "string" ? englishText : 
                     Array.isArray(englishText) ? englishText.join(" ") : 
                     String(englishText ?? "");

    // ✅ Run Enhanced LangGraph Workflow (not the old stream)
    const processedResult = await runEnhancedLanggraphWorkflow(
      user.id,
      safeName,
      finalText
    );

    // Save to database
    const savedDoc = await saveWithEmbedding(supabase, {
      user_id: user.id,
      file_name: processedResult.filename,
      text: processedResult.text,                 // ✅ updated (was content)
      structure: processedResult.uiStructure,     // ✅ updated (was structure)
      category: processedResult.category,
      json: {
        ...processedResult,
        chat_history: [],
      },
      title: processedResult.workflowOutput?.summary || processedResult.filename,
    });

    return NextResponse.json({
      result: {
        ...processedResult,
        db_id: savedDoc.id,
        chat_history: [],
      }
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Processing failed" },
      { status: 500 }
    );
  }
}
