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

// The recipient-notice, invite-subject, and invite-message fields are all
// sender-supplied free text that lands in an email a third party (the
// Signer) receives — everything else interpolated into these templates
// (title, names) is short and already trusted the same way elsewhere in
// this file. Escaping just these fields is deliberately narrower than a
// codebase-wide fix; see recipient-notice.ts.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Email headers are one line each — a raw newline in a sender-supplied
// subject would either break the header or (worse, on a naive SMTP sender)
// inject a second header. Resend's API takes `subject` as a JSON field, not
// a raw header line, so this is defense-in-depth rather than a live
// exploit today, but cheap enough to always do.
function sanitizeSubject(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

export async function sendSignerInviteEmail(opts: {
  to: string;
  signerName: string | null;
  senderName: string;
  documentTitle: string;
  signingToken: string;
  // Sender-editable text set on the document (documents.recipient_notice,
  // see supabase/migrations/0027) — SignedBy's suggested privacy-disclosure
  // wording, or the sender's own. Omitted/empty means the sender turned it
  // off. A Privacy Policy link is always appended when present so the
  // recipient can read the full policy, not just the sender's note.
  recipientNotice?: string | null;
  // Sender-editable subject/message (documents.invite_subject/
  // invite_message, migration 0029). Both replace/augment the default —
  // omitted/empty means "use the standard text" for each independently
  // (a custom message doesn't require a custom subject or vice versa).
  inviteSubject?: string | null;
  inviteMessage?: string | null;
}) {
  const link = `${appUrl()}/sign/${opts.signingToken}`;
  const greeting = opts.signerName ? `Hi ${opts.signerName},` : "Hi,";
  const subject = opts.inviteSubject
    ? sanitizeSubject(opts.inviteSubject)
    : `${opts.senderName} sent you "${opts.documentTitle}" to sign`;
  const messageBlock = opts.inviteMessage
    ? `<p style="white-space:pre-wrap;">${escapeHtml(opts.inviteMessage)}</p>`
    : "";
  const noticeBlock = opts.recipientNotice
    ? `
        <p style="color:#64748b;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:16px;">
          ${escapeHtml(opts.recipientNotice)}
          <a href="${appUrl()}/privacy" style="color:#64748b;">Privacy Policy</a>
        </p>
      `
    : "";

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>${greeting}</p>
        <p><strong>${opts.senderName}</strong> has asked you to review and sign <strong>${opts.documentTitle}</strong>.</p>
        ${messageBlock}
        ${ctaButton(link, "Review &amp; Sign")}
        <p style="color:#64748b;font-size:13px;">No account needed — this link is unique to you. If you weren't expecting this, you can ignore this email.</p>
        ${noticeBlock}
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

// Sent to the document owner when the reminders cron (src/app/api/cron/
// reminders/route.ts) auto-expires a document that was never fully signed —
// same "let the sender know something happened without them" shape as
// sendDeclineNotificationEmail above, just for a different terminal state.
export async function sendDocumentExpiredEmail(opts: { to: string; documentTitle: string; documentId: string }) {
  const link = `${appUrl()}/dashboard/documents/${opts.documentId}`;

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `"${opts.documentTitle}" expired before it was fully signed`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p><strong>${opts.documentTitle}</strong> reached its expiration date before every recipient signed, so it's no longer available for signature.</p>
        <p style="color:#64748b;font-size:13px;">Duplicate it to send a fresh copy, or remove the expiration date next time if you'd rather it stay open indefinitely.</p>
        ${ctaButton(link, "View Document")}
      </div>
    `,
  });
}

// Per-recipient authentication (Business tier, PER_RECIPIENT_AUTH_SCOPE.md):
// sent every time a signer required to verify requests a code, including
// resends — the code itself is the only thing that changes between sends,
// same shape as any other OTP email. Not a link — the whole point is proof
// the signer can read this specific inbox, not just click a button in it.
export async function sendVerificationCodeEmail(opts: {
  to: string;
  signerName: string | null;
  documentTitle: string;
  code: string;
}) {
  const greeting = opts.signerName ? `Hi ${opts.signerName},` : "Hi,";

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your verification code for "${opts.documentTitle}"`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>${greeting}</p>
        <p>Enter this code to confirm it's you before signing <strong>${opts.documentTitle}</strong>:</p>
        <div style="text-align:center; margin: 28px 0;">
          <span style="display:inline-block; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 28px; font-size:28px; font-weight:700; letter-spacing:8px; color:#0f172a;">${opts.code}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
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

// Trustpilot's Automatic Feedback Service (AFS): a unique per-account BCC
// address that, when copied on a transactional email, makes Trustpilot send
// the customer its own review-invite email later (timing/template are
// configured in the Trustpilot dashboard, not here — currently "1 week
// after" the purchase-experience template). Optional: undefined just means
// AFS isn't configured yet, not an error — see sendPlanUpgradeEmail, the
// only email that uses this.
function trustpilotAfsBcc(): string | undefined {
  return process.env.TRUSTPILOT_AFS_BCC || undefined;
}

// Sent once, right after a NEW subscription checkout completes (see the
// "checkout.session.completed" handler in api/webhooks/stripe/route.ts) —
// deliberately not on every renewal invoice, since re-triggering a review
// invite every month would be spammy and Trustpilot's own AFS timing
// assumes one send per genuinely new purchase. BCCs Trustpilot's AFS
// address (trustpilotAfsBcc above) so this same email doubles as the
// review-invite trigger set up in Settings > Automatic Feedback Service —
// skips the BCC entirely (still sends the email) if that env var isn't set.
export async function sendPlanUpgradeEmail(opts: { to: string; planLabel: string }) {
  const bcc = trustpilotAfsBcc();

  await getClient().emails.send({
    from: FROM,
    to: opts.to,
    ...(bcc ? { bcc: [bcc] } : {}),
    subject: `You're on the ${opts.planLabel} plan`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>Thanks for upgrading to <strong>${opts.planLabel}</strong> — your account is live on the new plan right away.</p>
        ${ctaButton(`${appUrl()}/dashboard`, "Go to your dashboard")}
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
