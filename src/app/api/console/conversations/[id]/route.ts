import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consoleConversationMessageSchema,
  deriveConversationTitle,
  requireConsoleAccess,
  type ConsoleConversationMessage,
} from "@/lib/console-conversations";

const updateBodySchema = z.object({
  messages: z.array(consoleConversationMessageSchema).min(1).max(200),
});

// GET /api/console/conversations/[id] — loads one saved conversation's
// full messages, to reopen it in the chat pane when clicked from the
// history sidebar.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("console_conversations")
    .select("id, title, messages")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json({ id: data.id, title: data.title, messages: data.messages });
}

// PATCH /api/console/conversations/[id] — overwrites the saved message
// array (console-chat.tsx's autosave effect calls this after every turn
// once a conversation already has a real id). Title is re-derived from
// the current first user message each time — cheap, and keeps it correct
// even though in practice the first message never changes after creation.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = updateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body." }, { status: 400 });
  }

  const messages = parsed.data.messages as ConsoleConversationMessage[];
  const title = deriveConversationTitle(messages);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("console_conversations")
    .update({ messages, title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .select("id, title")
    .single();

  if (error || !data) {
    console.error("Update console conversation failed", error);
    return NextResponse.json({ error: "Couldn't save this conversation." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, title: data.title });
}
