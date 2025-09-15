// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { processDocumentText } from "@/lib/utils/pdf-processor";
import { translateText } from "@/lib/utils/translate";
import { runEnhancedLanggraphWorkflow } from "@/lib/langgraph/main-langgraph";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max execution

/**
 * Create an admin Supabase client using service role key
 */
function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase URL or service key missing!");
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const supabase = getAdminSupabase();

  try {
    // ---------------------------
    // 🔑 Authenticate user
    // ---------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth failed:", userError);
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // ---------------------------
    // 📄 Parse uploaded file
    // ---------------------------
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

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

    if (!extractedText || extractedText.trim() === "") {
      return NextResponse.json({ error: "No text extracted from file" }, { status: 400 });
    }

    // ---------------------------
    // 🌐 Translate to English if needed
    // ---------------------------
    const englishText = await translateText(extractedText, "en");
    const finalText = typeof englishText === "string"
      ? englishText
      : Array.isArray(englishText)
      ? englishText.join(" ")
      : String(englishText ?? "");

    // ---------------------------
    // 🧠 Run AI Workflow
    // ---------------------------
    const processedResult = await runEnhancedLanggraphWorkflow(
      user.id,
      safeName,
      finalText
    );

    if (!processedResult) {
      return NextResponse.json({ error: "AI workflow returned no result" }, { status: 500 });
    }

    // ---------------------------
    // 💾 Save to conversations table
    // ---------------------------
    const { data, error: insertError } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: user.id,
          data: processedResult,
        }
      ])
      .select(); // return inserted row

    if (insertError) {
      console.error("Failed to insert into conversations:", insertError);
      return NextResponse.json({ error: "Failed to save conversation" }, { status: 500 });
    }

    const savedConversation = data?.[0];

    console.log("Conversation saved:", savedConversation);

    // ---------------------------
    // ✅ Return saved conversation
    // ---------------------------
    return NextResponse.json({
      result: savedConversation
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Processing failed" },
      { status: 500 }
    );
  }
}
