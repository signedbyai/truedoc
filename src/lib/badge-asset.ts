import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

// Server-side badge/QR image generation (VERIFIED_BADGE_SCOPE.md #5 + the
// decoupled "badge on the standard certificate page" addition). Deliberately
// NOT the SVG+cairosvg pipeline used for the one-off, build-time LinkedIn
// banner (marketing/linkedin-page/) — this needs a fresh QR payload per
// document at request time inside a Vercel serverless function, so it uses
// `qrcode` (pure JS, no native/system deps) for the QR itself and `sharp`
// (already vendored with librsvg — see package.json) to rasterize a
// composed SVG template into one flat PNG. Both functions below return a
// PNG Buffer: generateCertificateBadge for the small in-page mark used on
// EVERY signed document's certificate page, generateVerifiedBadgeImage for
// the larger standalone downloadable asset that's one of Verified Badge's
// three "what comes back" deliverables.

// Black/option-C mark (confirmed against brand-assets/badge-only/ 2026-08-01
// — see VERIFIED_BADGE_SCOPE.md decision 7): a static verification seal
// isn't a conversion CTA, so it doesn't use the yellow reserved for that
// (design-system.md's accent rule), and option C's shorter, more compact
// slash proportions are the ones actually in use (matches src/app/icon.svg).
let markBase64Cache: string | null = null;
async function loadMarkBase64(): Promise<string> {
  if (markBase64Cache) return markBase64Cache;
  const filePath = path.join(process.cwd(), "public", "brand", "verified-badge-mark-black.png");
  const buf = await fs.readFile(filePath);
  markBase64Cache = buf.toString("base64");
  return markBase64Cache;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The visible-text URL is deliberately the short, generic "domain/verify"
// pointer, not the full hash-bearing deep link — same reasoning as the
// existing certificate page's two-line design (generate-signed-pdf.ts):
// a 128-hex-char SHA-512 hash doesn't fit legibly as badge text at any
// reasonable size. The QR itself still encodes the real deep link
// (verifyUrl, with ?hash=... included) so scanning it always lands
// directly on this document's ledger entry, not just the generic /verify
// search form.
function shortLabel(verifyUrl: string): string {
  try {
    const u = new URL(verifyUrl);
    return `${u.host}${u.pathname}`;
  } catch {
    return verifyUrl.replace(/^https?:\/\//, "").split("?")[0];
  }
}

/** Small, compact mark+QR (no card chrome) for embedding on the existing
 *  "Certificate of Completion" page every signed document already gets —
 *  sized to sit comfortably in the page's own layout (generate-signed-pdf.ts).
 *  Independent of Verified Badge's bigger pieces; targets the existing,
 *  unmodified /verify?hash=... lookup. */
export async function generateCertificateBadge(verifyUrl: string): Promise<Buffer> {
  const [markBase64, qrDataUrl] = await Promise.all([
    loadMarkBase64(),
    QRCode.toDataURL(verifyUrl, { width: 200, margin: 0, color: { dark: "#0f172a", light: "#00000000" } }),
  ]);

  const width = 300;
  const height = 130;
  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="none"/>
  <image x="0" y="15" width="100" height="100" href="${qrDataUrl}"/>
  <image x="112" y="15" width="26" height="26" href="data:image/png;base64,${markBase64}"/>
  <text x="112" y="58" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">Scan to verify</text>
  <text x="112" y="76" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#64748b">${escapeXml(shortLabel(verifyUrl))}</text>
  <text x="112" y="92" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#64748b">Genuine, unaltered document</text>
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** The full standalone "Badge" asset — a shareable seal meant to be reused
 *  across many contexts (invoice footer, portfolio site, email signature),
 *  not tied to one PDF page layout. Incorporates the QR (linking to the
 *  per-document ledger page), the SignedBy mark, and the verification URL
 *  as visible text, so it reads as legitimate even printed or screenshotted,
 *  not only when scanned (VERIFIED_BADGE_SCOPE.md #5). */
export async function generateVerifiedBadgeImage(verifyUrl: string): Promise<Buffer> {
  const [markBase64, qrDataUrl] = await Promise.all([
    loadMarkBase64(),
    QRCode.toDataURL(verifyUrl, { width: 420, margin: 1, color: { dark: "#0f172a", light: "#ffffffff" } }),
  ]);

  const width = 640;
  const height = 820;
  const label = escapeXml(shortLabel(verifyUrl));

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="28" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <image x="40" y="48" width="72" height="72" href="data:image/png;base64,${markBase64}"/>
  <text x="128" y="82" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#0f172a">SignedBy</text>
  <text x="128" y="110" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="1.5" fill="#475569">VERIFIED &amp; SEALED</text>
  <line x1="40" y1="150" x2="${width - 40}" y2="150" stroke="#e2e8f0" stroke-width="1.5"/>
  <image x="${(width - 420) / 2}" y="188" width="420" height="420" href="${qrDataUrl}"/>
  <text x="${width / 2}" y="650" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="600" fill="#0f172a" text-anchor="middle">Scan or visit to verify</text>
  <text x="${width / 2}" y="680" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#475569" text-anchor="middle">${label}</text>
  <text x="${width / 2}" y="${height - 34}" font-family="Helvetica, Arial, sans-serif" font-size="10.5" fill="#94a3b8" text-anchor="middle">Unaltered since sealed. Timestamp and identity cryptographically verified.</text>
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}
