import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/history
 * Body: { sessionId?: string, displayInput?: any, newMessage?: { role: string, content: string } }
 * Creates new history record if sessionId not provided, otherwise updates existing one.
 */
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await req.json();
  const { sessionId, displayInput, newMessage } = body;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!sessionId) {
    // Create new history entry
    const { data, error } = await supabase
      .from("document_sessions")
      .insert({
        user_id: user.id,
        display_input: displayInput || {},
        chat_history: newMessage ? [newMessage] : [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  // Fetch existing chat history
  const { data: session, error: fetchErr } = await supabase
    .from("document_sessions")
    .select("chat_history")
    .eq("id", sessionId)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

  const updatedHistory = [
    ...(session?.chat_history || []),
    ...(newMessage ? [newMessage] : []),
  ];

  // Update history
  const { data, error } = await supabase
    .from("document_sessions")
    .update({
      display_input: displayInput || {},
      chat_history: updatedHistory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

/**
 * GET /api/history
 * Returns all history for current user.
 */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("document_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
