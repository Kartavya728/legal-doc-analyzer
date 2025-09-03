import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, summary, important_points, category, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch history error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (err: any) {
    console.error("History route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
