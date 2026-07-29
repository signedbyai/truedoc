import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignerByToken, requireVerifiedSigner } from "@/lib/signing";
import { sendDeclineNotificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { scheduleWebhookEvent } from "@/lib/webhooks";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// A signer can decline instead of signing. This ends the document for
// everyone — matches how the rest of the schema treats `declined` as a
// terminal, document-level status (see documents.status check constraint).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await checkRateLimit(`sign-decline:${getClientIp(request)}`, 10, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  if (signer.status === "signed") {
    return NextResponse.json({ error: "You've already signed this document." }, { status: 400 });
  }
  if (signer.status === "declined" || document.status === "declined") {
    return NextResponse.json({ error: "This document has already been declined." }, { status: 400 });
  }
  if (document.status === "voided") {
    return NextResponse.json({ error: "This document is no longer available." }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const reason = parsed.success ? parsed.data.reason || null : null;

  const ip = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  await admin.from("signers").update({ status: "declined" }).eq("id", signer.id);
  await admin.from("documents").update({ status: "declined" }).eq("id", document.id);
  await admin.from("audit_events").insert({
    document_id: document.id,
    signer_id: signer.id,
    event_type: "declined",
    ip_address: ip,
    user_agent: userAgent,
    metadata: reason ? { reason } : {},
  });

  // Outbound webhook (CRM_MCP_READINESS_PHASE1_SCOPE.md Part C).
  scheduleWebhookEvent(document.org_id, "document.declined", {
    document_id: document.id,
    title: document.title,
    status: "declined",
    signer: { email: signer.email, name: signer.name },
  });

  const { data: doc } = await admin.from("documents").select("owner_id, title").eq("id", document.id).single();
  if (doc) {
    const { data: ownerData } = await admin.auth.admin.getUserById(doc.owner_id);
    const ownerEmail = ownerData?.user?.email;
    if (ownerEmail) {
      await sendDeclineNotificationEmail({
        to: ownerEmail,
        documentTitle: doc.title,
        documentId: document.id,
        signerName: signer.name,
        signerEmail: signer.email,
        reason,
      }).catch((err) => console.error("Decline notification email failed", err));
    }
  }

  return NextResponse.json({ success: true });
}
