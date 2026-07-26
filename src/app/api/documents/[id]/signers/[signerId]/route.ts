import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { sendSignerInviteEmail } from "@/lib/email";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";

const bodySchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email(),
});

// Fixes a typo'd/wrong recipient after the document has already been sent —
// previously the only remedy was voiding the entire document, which loses
// any signatures already collected from other signers in a sequential flow.
// Deliberately does NOT touch the signers row's id or its document_fields
// (still linked by signer_id), so already-placed fields stay assigned to
// the corrected person. Only the email/name/token/status change.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; signerId: string }> }
) {
  const { id, signerId } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, org_id, title, status, recipient_notice, invite_subject, invite_message")
    .eq("id", id)
    .single();
  if (!doc || doc.org_id !== orgId) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status !== "sent") {
    return NextResponse.json(
      { error: "Recipients can only be corrected while a document is out for signature." },
      { status: 400 }
    );
  }

  const { data: signer } = await supabase
    .from("signers")
    .select("id, document_id, name, email, status")
    .eq("id", signerId)
    .single();
  if (!signer || signer.document_id !== id) {
    return NextResponse.json({ error: "Signer not found" }, { status: 404 });
  }
  if (signer.status === "signed") {
    return NextResponse.json({ error: "This signer has already signed and can't be edited." }, { status: 400 });
  }

  const newEmail = parsed.data.email;
  const newName = parsed.data.name || null;
  const wasAlreadyNotified = signer.status === "sent" || signer.status === "viewed";

  // Rotate the token unconditionally: invalidates any previously-issued
  // link (whether it went to the wrong person or just needs a clean
  // restart), even if this signer's tier hasn't been notified yet.
  const newToken = crypto.randomUUID();

  const update: Record<string, unknown> = {
    email: newEmail,
    name: newName,
    signing_token: newToken,
  };
  if (wasAlreadyNotified) {
    update.status = "sent";
    update.sent_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase.from("signers").update(update).eq("id", signerId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Informational only, never blocking — a correction is already a
  // deliberate, one-off action, so this is a note rather than a confirm
  // step. See BOUNCE_TRACKING_SCOPE.md.
  const domainCheck = await checkEmailDomainHasMx(newEmail);

  if (wasAlreadyNotified) {
    const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
    const senderName = org?.name || user.email || "Someone";
    try {
      const { id: emailId, error: emailError } = await sendSignerInviteEmail({
        to: newEmail,
        signerName: newName,
        senderName,
        documentTitle: doc.title,
        signingToken: newToken,
        recipientNotice: doc.recipient_notice,
        inviteSubject: doc.invite_subject,
        inviteMessage: doc.invite_message,
      });
      await supabase
        .from("signers")
        .update({
          last_email_id: emailId,
          last_email_event: emailError ? "send_failed" : "sent",
          last_email_event_at: new Date().toISOString(),
        })
        .eq("id", signerId);
    } catch (err) {
      console.error("Corrected-recipient invite email failed", err);
      return NextResponse.json(
        { error: "Recipient was updated, but the new invite email failed to send. Try 'Send reminder' once available." },
        { status: 500 }
      );
    }
  }

  await supabase.from("audit_events").insert({
    document_id: id,
    signer_id: signerId,
    event_type: "recipient_corrected",
    metadata: { old_email: signer.email, new_email: newEmail, old_name: signer.name, new_name: newName },
  });

  return NextResponse.json({
    success: true,
    resent: wasAlreadyNotified,
    ...(domainCheck.ok ? {} : { domainWarning: domainCheck.reason }),
  });
}
