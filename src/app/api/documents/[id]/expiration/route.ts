import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndOrg } from "@/lib/org";
import { bodySchema } from "./schema";

// Sets (or clears) documents.expires_at (migration 0030) — free on every
// plan, unlike payment collection/DocGate. Enforced by the reminders cron
// (src/app/api/cron/reminders/route.ts), which flips a "sent" document past
// its expires_at to the 'expired' terminal status. Saved immediately via
// its own endpoint (same shape as the payment-link route), independent of
// Send, so it can be set on a draft before it's ever sent or adjusted after.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid date and time, or leave it blank." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id, org_id").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase
    .from("documents")
    .update({ expires_at: parsed.data.expires_at || null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
