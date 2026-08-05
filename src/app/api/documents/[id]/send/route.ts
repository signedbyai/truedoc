import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sendSignerInviteEmail } from "@/lib/email";
import { signersWithoutFields } from "@/lib/field-visibility";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";
import { checkFreePlanSendCap } from "@/lib/plan";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  // Optional — the field editor's "Customize invite email" modal. Same
  // undefined-skips-the-column pattern for all three: a missing/invalid body
  // leaves the document's existing values untouched rather than clobbering
  // them. recipientNotice's '' means explicitly turned off; inviteSubject/
  // inviteMessage have no "off" state of their own, so an empty string there
  // is normalized to null ("use the default") rather than stored as "".
  const json = await request.json().catch(() => null);
  const recipientNotice =
    json && typeof json.recipientNotice === "string" ? json.recipientNotice.trim().slice(0, 2000) : undefined;
  const inviteSubject =
    json && typeof json.inviteSubject === "string" ? json.inviteSubject.trim().slice(0, 200) || null : undefined;
  const inviteMessage =
    json && typeof json.inviteMessage === "string" ? json.inviteMessage.trim().slice(0, 2000) || null : undefined;
  // A pre-send domain check the sender can override — see
  // BOUNCE_TRACKING_SCOPE.md. First call omits/false this; if any recipient's
  // domain looks invalid we return early with domainWarnings and don't send
  // anything yet, so the field editor can show a "send anyway?" confirmation
  // (same shape as the existing missing-fields review modal) before retrying
  // with this set to true.
  const confirmDomainWarnings = json?.confirmDomainWarnings === true;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, title, status, org_id")
    .eq("id", id)
    .single();

  if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status !== "draft") {
    return NextResponse.json({ error: "This document has already been sent" }, { status: 400 });
  }

  // Free plan's 3-sends/month cap (2026-08-05) — checked here, right before
  // a document actually goes out, not at upload/draft-creation time (see
  // plan.ts's checkFreePlanSendCap comment for why this moved). Independent
  // of the separate 3-seals/month cap Verified Badge sealing has its own
  // check for.
  const capResponse = await checkFreePlanSendCap(supabase, orgId, "documents_send");
  if (capResponse) return capResponse;

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

  if (!confirmDomainWarnings) {
    const checks = await Promise.all(toNotify.map((s) => checkEmailDomainHasMx(s.email)));
    const domainWarnings = checks.filter((c) => !c.ok).map((c) => (c as { reason: string }).reason);
    if (domainWarnings.length > 0) {
      return NextResponse.json({ domainWarnings });
    }
  }

  for (const signer of toNotify) {
    const { id: emailId, error: emailError } = await sendSignerInviteEmail({
      to: signer.email,
      signerName: signer.name,
      senderName,
      documentTitle: doc.title,
      signingToken: signer.signing_token,
      recipientNotice,
      inviteSubject,
      inviteMessage,
    });
    await supabase
      .from("signers")
      .update({
        last_email_id: emailId,
        last_email_event: emailError ? "send_failed" : "sent",
        last_email_event_at: new Date().toISOString(),
      })
      .eq("id", signer.id);
  }

  await supabase
    .from("signers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .in(
      "id",
      toNotify.map((s) => s.id)
    );

  await supabase
    .from("documents")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      ...(recipientNotice !== undefined ? { recipient_notice: recipientNotice } : {}),
      ...(inviteSubject !== undefined ? { invite_subject: inviteSubject } : {}),
      ...(inviteMessage !== undefined ? { invite_message: inviteMessage } : {}),
    })
    .eq("id", id);

  await supabase.from("audit_events").insert({
    document_id: id,
    event_type: "sent",
    metadata: { sent_by: user.id, signer_count: signers.length },
  });

  return NextResponse.json({ success: true });
}
