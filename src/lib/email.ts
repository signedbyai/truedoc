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
