import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sendSignerInviteEmail } from "@/lib/email";
import { signersWithoutFields } from "@/lib/field-visibility";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, title, status, org_id")
    .eq("id", id)
    .single();

  if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status !== "draft") {
    return NextResponse.json({ error: "This document has already been sent" }, { status: 400 });
  }

  const { data: signers, error: signersError } = await supabase
    .from("signers")
    .select("id, name, email, order_index, status, signing_token")
    .eq("document_id", id)
    .order("order_index", { ascending: true });

  if (signersError) return NextResponse.json({ error: signersError.message }, { status: 500 });
  if (!signers || signers.length === 0) {
    return NextResponse.json({ error: "Add at least one signer before sending" }, { status: 400 });
  }

  const { data: fields } = await supabase
    .from("document_fields")
    .select("id, signer_id, template_role")
    .eq("document_id", id);
  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: "Place at least one field before sending" }, { status: 400 });
  }

  // Every recipient must have at least one field to sign. Otherwise a signer
  // with no fields only ever consents to an empty document, which can quietly
  // mark the whole thing "completed" without them actually signing anything
  // (the reported "I signed everything from the first email" case). Authoritative
  // server-side guard — the editor blocks the same state, but never trust that.
  const missingIds = new Set(signersWithoutFields(fields, signers.map((s) => s.id)));
  if (missingIds.size > 0) {
    const names = signers
      .filter((s) => missingIds.has(s.id))
      .map((s) => s.name?.trim() || s.email)
      .join(", ");
    return NextResponse.json(
      {
        error: `Every recipient needs at least one field to sign. ${names} ${
          missingIds.size === 1 ? "has" : "have"
        } none — assign a field or remove ${missingIds.size === 1 ? "that recipient" : "those recipients"}.`,
      },
      { status: 400 }
    );
  }

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
  const senderName = org?.name || user.email || "Someone";

  // Sequential routing: only the lowest order_index tier gets emailed now.
  // Signers sharing that order_index are notified in parallel; later tiers
  // are emailed as each prior tier finishes (see the submit route).
  const firstTier = signers[0].order_index;
  const toNotify = signers.filter((s) => s.order_index === firstTier);

  for (const signer of toNotify) {
    await sendSignerInviteEmail({
      to: signer.email,
      signerName: signer.name,
      senderName,
      documentTitle: doc.title,
      signingToken: signer.signing_token,
    });
  }

  await supabase
    .from("signers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .in(
      "id",
      toNotify.map((s) => s.id)
    );

  await supabase.from("documents").update({ status: "sent" }).eq("id", id);

  await supabase.from("audit_events").insert({
    document_id: id,
    event_type: "sent",
    metadata: { sent_by: user.id, signer_count: signers.length },
  });

  return NextResponse.json({ success: true });
}
