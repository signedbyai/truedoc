import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";

const bodySchema = z.object({ enabled: z.boolean() });

// Per-document mute for the "signer just opened" sender email (V3 #8).
// No plan gate: the email itself is ungated (it's basic send-status
// courtesy, like the completion email), so muting it isn't gated either.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase.from("documents").update({ open_notifications: parsed.data.enabled }).eq("id", id);
  if (error) {
    console.error("open_notifications update failed", error);
    return NextResponse.json({ error: "Couldn't update notifications." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
