import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";

// Lets the sending org cancel a document that's out for signature. Only
// meaningful while it's "sent" — draft docs were never sent, and
// completed/declined/voided are already terminal.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: doc } = await supabase.from("documents").select("id, org_id, status").eq("id", id).single();
  if (!doc || doc.org_id !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.status !== "sent") {
    return NextResponse.json({ error: "Only documents that are out for signature can be voided." }, { status: 400 });
  }

  await supabase.from("documents").update({ status: "voided" }).eq("id", id);
  await supabase.from("audit_events").insert({
    document_id: id,
    event_type: "voided",
    metadata: { voided_by: user.id },
  });

  return NextResponse.json({ success: true });
}
