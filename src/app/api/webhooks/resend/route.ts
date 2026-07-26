import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBounceNotificationEmail } from "@/lib/email";
import { resolveEventOutcome } from "./resolve-event-outcome";

// See BOUNCE_TRACKING_SCOPE.md. Resend reports delivery events (Svix-signed,
// same verification shape as the existing /api/webhooks/stripe route: raw
// text body, signature header, service-role admin client since this arrives
// unauthenticated). Correlated back to a signer via signers.last_email_id,
// the Resend message id captured at send time (lib/email.ts).

type ResendWebhookEvent = {
  type: string;
  data: { email_id?: string; to?: string[] };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Must be the raw text body — parsing then re-stringifying breaks the
  // signature, same class of gotcha as any other body-shape issue.
  const payload = await request.text();
  const resend = new Resend(apiKey);

  let event: ResendWebhookEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    }) as ResendWebhookEvent;
  } catch (err) {
    console.error("Resend webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { status, notifySender } = resolveEventOutcome(event.type);
  const emailId = event.data?.email_id;
  if (!status || !emailId) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  // last_email_id only tracks the MOST RECENT send to a signer (see
  // migration 0035) — an older send's event arriving after a newer one was
  // already recorded just won't match any row, which is an acceptable,
  // rare edge case rather than something worth a full history table for.
  const { data: signer } = await admin
    .from("signers")
    .update({ last_email_event: status, last_email_event_at: new Date().toISOString() })
    .eq("last_email_id", emailId)
    .select("id, name, email, document_id")
    .maybeSingle();

  if (signer && notifySender) {
    try {
      const { data: doc } = await admin
        .from("documents")
        .select("id, title, owner_id")
        .eq("id", signer.document_id)
        .single();
      if (doc) {
        const { data: ownerData } = await admin.auth.admin.getUserById(doc.owner_id);
        const ownerEmail = ownerData?.user?.email;
        if (ownerEmail) {
          await sendBounceNotificationEmail({
            to: ownerEmail,
            documentTitle: doc.title,
            documentId: doc.id,
            signerName: signer.name,
            signerEmail: signer.email,
            reason: event.type === "email.bounced" ? "bounced" : "suppressed",
          });
        }
      }
    } catch (err) {
      console.error("Bounce notification email failed", err);
    }
  }

  return NextResponse.json({ received: true });
}
