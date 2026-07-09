import { Resend } from "resend";

// Transactional emails for the signing flow (invites, completion notices).
// Separate from Supabase Auth's magic-link emails, which go through the
// SMTP integration configured in the Supabase dashboard. Both ultimately
// send through Resend, but this path is for app-triggered notifications
// where we control the content directly.

let client: Resend | null = null;

function getClient() {
  if (client) return client;
  client = new Resend(process.env.RESEND_API_KEY!);
  return client;
}

const FROM = "SignedBy <notifications@updates.signedby.ai>";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}

export async function sendSignerInviteEmail(opts: {
  to: string;
  signerName: string | null;
  senderName: string;
  documentTitle: string;
  signingToken: string;
}) {
  const link = `${appUrl()}/sign/${opts.signingToken}`;
  const greeting = opts.signerName ? `Hi ${opts.signerName},` : "Hi,";

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.senderName} sent you "${opts.documentTitle}" to sign`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>${greeting}</p>
        <p><strong>${opts.senderName}</strong> has asked you to review and sign <strong>${opts.documentTitle}</strong>.</p>
        <p style="margin: 32px 0;">
          <a href="${link}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Review &amp; sign</a>
        </p>
        <p style="color:#64748b;font-size:13px;">No account needed — this link is unique to you. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendCompletionEmail(opts: {
  to: string;
  documentTitle: string;
  documentId: string;
}) {
  const link = `${appUrl()}/dashboard/documents/${opts.documentId}`;
  const downloadLink = `${appUrl()}/api/documents/${opts.documentId}/signed-file`;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `All signers have signed "${opts.documentTitle}"`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p><strong>${opts.documentTitle}</strong> has been signed by everyone and is now complete.</p>
        <p style="margin: 32px 0;">
          <a href="${downloadLink}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Download signed PDF</a>
        </p>
        <p style="color:#64748b;font-size:13px;"><a href="${link}" style="color:#64748b;">View in dashboard</a></p>
      </div>
    `,
  });
}
