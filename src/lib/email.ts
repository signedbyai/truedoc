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

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai").replace(/\/$/, "");
}

// A lot of these links get opened by someone who isn't at a desk — a
// contractor's client opening the "please sign this waiver" email on
// their phone, standing on a driveway. `text-align:center` on the
// wrapping block (not flexbox — far better supported across email
// clients, including Outlook desktop) plus a big `display:inline-block`
// tap target, rather than a small inline text link.
function ctaButton(href: string, label: string) {
  return `
    <div style="text-align:center; margin: 32px 0;">
      <a href="${href}" style="display:inline-block; background:#0f172a; color:#ffffff; padding:18px 40px; border-radius:10px; text-decoration:none; font-weight:700; font-size:18px; line-height:1.2;">
        ${label}
      </a>
    </div>
  `;
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
        ${ctaButton(link, "Review &amp; Sign")}
        <p style="color:#64748b;font-size:13px;">No account needed — this link is unique to you. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendReminderEmail(opts: {
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
    subject: `Reminder: ${opts.documentTitle} is waiting for your signature`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>${greeting}</p>
        <p>Just a reminder — <strong>${opts.senderName}</strong> is still waiting on your signature for
        <strong>${opts.documentTitle}</strong>.</p>
        ${ctaButton(link, "Review &amp; Sign")}
        <p style="color:#64748b;font-size:13px;">No account needed — this link is unique to you. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendDeclineNotificationEmail(opts: {
  to: string;
  documentTitle: string;
  documentId: string;
  signerName: string | null;
  signerEmail: string;
  reason: string | null;
}) {
  const link = `${appUrl()}/dashboard/documents/${opts.documentId}`;
  const who = opts.signerName ? `${opts.signerName} (${opts.signerEmail})` : opts.signerEmail;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `${who} declined to sign "${opts.documentTitle}"`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p><strong>${who}</strong> declined to sign <strong>${opts.documentTitle}</strong>.</p>
        ${opts.reason ? `<p style="color:#334155;">Reason given: &ldquo;${opts.reason}&rdquo;</p>` : ""}
        ${ctaButton(link, "View Document")}
      </div>
    `,
  });
}

export async function sendTeamInviteEmail(opts: {
  to: string;
  orgName: string;
  inviterEmail: string;
  token: string;
}) {
  const link = `${appUrl()}/team/accept/${opts.token}`;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.inviterEmail} invited you to join ${opts.orgName} on SignedBy`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>Hi,</p>
        <p><strong>${opts.inviterEmail}</strong> invited you to join <strong>${opts.orgName}</strong>'s workspace on SignedBy.</p>
        ${ctaButton(link, "Accept Invite")}
        <p style="color:#64748b;font-size:13px;">This invite expires in 14 days. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendAdminDigestEmail(opts: {
  to: string;
  bcc: string[];
  dateLabel: string;
  loggedInToday: number;
  loggedInWeek: number;
  loggedInMonth: number;
  loggedInEver: number;
  totalUsers: number;
  freeOrgs: number;
  paidOrgs: number;
  totalSignings: number;
  totalDocumentsSigned: number;
}) {
  const totalOrgs = opts.freeOrgs + opts.paidOrgs;
  const row = (label: string, value: string | number) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:14px;">${label}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right;">${value}</td>
    </tr>
  `;
  const bigStat = (label: string, value: string | number) => `
    <td style="padding:14px 16px;background:#f8fafc;border-radius:10px;text-align:center;">
      <div style="color:#0f172a;font-size:28px;font-weight:800;">${value}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">${label}</div>
    </td>
  `;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    bcc: opts.bcc,
    subject: `SignedBy daily stats — ${opts.dateLabel}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin:0 0 4px;color:#0f172a;">SignedBy — ${opts.dateLabel}</h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 20px;">Automated daily digest.</p>

        <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 0 20px -8px;">
          <tr>
            ${bigStat("Documents signed, ever", opts.totalDocumentsSigned)}
            ${bigStat("Signings, ever", opts.totalSignings)}
          </tr>
        </table>

        <h3 style="margin:0 0 4px;color:#0f172a;font-size:15px;">Logged in (unique users)</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          ${row("Today", opts.loggedInToday)}
          ${row("This week", opts.loggedInWeek)}
          ${row("This month", opts.loggedInMonth)}
          ${row("Ever", opts.loggedInEver)}
          ${row("Total registered users", opts.totalUsers)}
        </table>

        <h3 style="margin:0 0 4px;color:#0f172a;font-size:15px;">Customers (organizations)</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Free", opts.freeOrgs)}
          ${row("Paid", opts.paidOrgs)}
          ${row("Total", totalOrgs)}
        </table>
      </div>
    `,
  });
}

// Signer-facing DocGate notification — sent only to signers who finished
// *before* the whole document completed (the signer whose own submission
// completes it sees the gate link immediately on their confirmation screen
// instead; see signing-view.tsx). This is the only email in the app sent to
// a signer after they're done signing, so it needs to be unmistakable at a
// glance in an inbox next to routine "please sign"/"reminder" mail — hence
// the `[DocGate]` bracket prefix, a pattern no other SignedBy subject line
// uses (every other subject here is a plain sentence with no prefix at
// all), rather than relying on wording alone to stand out.
export async function sendSignerDocGateEmail(opts: {
  to: string;
  signerName: string | null;
  documentTitle: string;
  // The signer's own tracked /g/[code] redirect link, NOT the raw
  // sender-supplied URL — clicking it logs an audit_events row before
  // forwarding on. See src/app/g/[code]/route.ts.
  gateLink: string;
  docgateLabel: string | null;
}) {
  const greeting = opts.signerName ? `Hi ${opts.signerName},` : "Hi,";

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `[DocGate] Your access link for "${opts.documentTitle}"`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>${greeting}</p>
        <p>Everyone has now signed <strong>${opts.documentTitle}</strong>.</p>
        <p style="color:#334155;">${opts.docgateLabel || "Your access link is ready:"}</p>
        ${ctaButton(opts.gateLink, opts.docgateLabel || "Access link")}
        <p style="color:#64748b;font-size:13px;">This link is unique to you. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

// "Signer just opened your document" (V3 #8, email flavor — push is the
// later upgrade when the PWA lands). Fires at most once per signer per
// document: the caller hooks the first-open `viewed` transition, which only
// happens while a signer is still pending/sent (see sign/[token]/page.tsx).
// The dashboard link lands on the doc detail page, where the live
// "Viewing now" pill is probably still lit if the sender clicks fast.
export async function sendSignerOpenedEmail(opts: {
  to: string;
  signerName: string | null;
  signerEmail: string;
  documentTitle: string;
  documentId: string;
}) {
  const who = opts.signerName || opts.signerEmail;
  const link = `${appUrl()}/dashboard/documents/${opts.documentId}`;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `${who} just opened "${opts.documentTitle}"`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p><strong>${who}</strong> just opened <strong>${opts.documentTitle}</strong> for the first time.</p>
        ${ctaButton(link, "Watch It Live")}
        <p style="color:#64748b;font-size:13px;">You get one of these the first time each signer opens a document. Too many? Turn them off for this document from <a href="${link}" style="color:#64748b;">its page</a>.</p>
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
        ${ctaButton(downloadLink, "Download Signed PDF")}
        <p style="color:#64748b;font-size:13px;"><a href="${link}" style="color:#64748b;">View in dashboard</a></p>
      </div>
    `,
  });
}

// Internal "someone sent feedback" email to the team, from the in-app feedback
// widget (the nav message-bubble icon). replyTo is the user's address so the
// team can just hit reply. FEEDBACK_TO_EMAIL overrides the default recipient.
export async function sendFeedbackEmail(opts: {
  message: string;
  fromEmail: string;
  fromName: string | null;
  orgName: string | null;
  plan: string | null;
  page: string | null;
}) {
  const to = process.env.FEEDBACK_TO_EMAIL || "feedback@signedby.ai";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const who = opts.fromName ? `${esc(opts.fromName)} (${esc(opts.fromEmail)})` : esc(opts.fromEmail);
  const meta = [
    opts.orgName ? `Org: ${esc(opts.orgName)}` : null,
    opts.plan ? `Plan: ${esc(opts.plan)}` : null,
    opts.page ? `Page: ${esc(opts.page)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await getClient().emails.send({
    from: FROM,
    to,
    replyTo: opts.fromEmail || undefined,
    subject: `Feedback from ${opts.fromName || opts.fromEmail}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <p style="margin:0 0 4px;"><strong>${who}</strong> sent feedback:</p>
        <blockquote style="margin:12px 0; padding:12px 16px; border-left:3px solid #e2e8f0; background:#f8fafc; white-space:pre-wrap; font-size:15px; color:#0f172a;">${esc(opts.message)}</blockquote>
        ${meta ? `<p style="color:#64748b;font-size:13px;">${meta}</p>` : ""}
        <p style="color:#94a3b8;font-size:12px;">Reply to this email to respond directly.</p>
      </div>
    `,
  });
}
