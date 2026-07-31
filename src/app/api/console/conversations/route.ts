import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consoleConversationMessageSchema,
  deriveConversationTitle,
  requireConsoleAccess,
  type ConsoleConversationMessage,
} from "@/lib/console-conversations";

const createBodySchema = z.object({
  messages: z.array(consoleConversationMessageSchema).min(1).max(200),
});

// GET /api/console/conversations — lists the current user's saved console
// chat sessions for the history sidebar (id/title/updated_at only, not the
// full message payload — keeps the list request light even with a long
// history). Newest first.
export async function GET() {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("console_conversations")
    .select("id, title, updated_at")
    .eq("org_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("List console conversations failed", error);
    return NextResponse.json({ error: "Couldn't load chat history." }, { status: 500 });
  }
  return NextResponse.json({ conversations: data ?? [] });
}

// POST /api/console/conversations — creates a new saved conversation.
// Deliberately NOT called when the user clicks "+ New chat" (that's a
// purely client-side reset — no empty row created just from clicking it).
// This only fires once a conversation actually has at least one message,
// from console-chat.tsx's own autosave effect the first time it needs to
// turn a null conversationId into a real one. Title is server-derived
// (deriveConversationTitle), not client-supplied, so there's one source
// of truth for what a session is called.
export async function POST(request: Request) {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;

  const json = await request.json().catch(() => null);
  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  const messages = parsed.data.messages as ConsoleConversationMessage[];
  const title = deriveConversationTitle(messages);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("console_conversations")
    .insert({ org_id: ctx.orgId, user_id: ctx.userId, title, messages })
    .select("id, title")
    .single();

  if (error || !data) {
    console.error("Create console conversation failed", error);
    return NextResponse.json({ error: "Couldn't save this conversation." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, title: data.title });
}
