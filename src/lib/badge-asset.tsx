import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";

// Server-side badge/QR image generation (VERIFIED_BADGE_SCOPE.md #5 + the
// decoupled "badge on the standard certificate page" addition). Deliberately
// NOT the SVG+cairosvg pipeline used for the one-off, build-time LinkedIn
// banner (marketing/linkedin-page/) — this needs a fresh QR payload per
// document at request time inside a Vercel serverless function.
//
// FIXED 2026-08-01 (direct report: "even the word VERIFIED was missing from
// the badge"): this used to hand-build an SVG string with <text> elements
// and rasterize it via sharp (librsvg under the hood). librsvg resolves
// font-family through fontconfig against whatever fonts are actually
// installed on the machine — Vercel's Node serverless runtime ships none,
// so every single <text> element silently failed to draw (no error, no
// warning — the QR and mark images rendered fine since those are raster,
// not text, which is exactly why this went unnoticed until someone actually
// looked at a real downloaded badge). Switched to next/og's ImageResponse
// (Satori + resvg) instead — the same renderer already used successfully by
// every opengraph-image.tsx in this app (see src/app/opengraph-image.tsx),
// which ships its own bundled default font and needs nothing installed on
// the host. Both functions below still return a PNG Buffer: generateCertificateBadge
// for the small in-page mark used on EVERY signed document's certificate
// page, generateVerifiedBadgeImage for the larger standalone downloadable
// asset that's one of Verified Badge's three "what comes back" deliverables.

// Black/option-C mark (confirmed against brand-assets/badge-only/ 2026-08-01
// — see VERIFIED_BADGE_SCOPE.md decision 7): a static verification seal
// isn't a conversion CTA, so it doesn't use the yellow reserved for that
// (design-system.md's accent rule), and option C's shorter, more compact
// slash proportions are the ones actually in use (matches src/app/icon.svg).
let markDataUriCache: string | null = null;
async function loadMarkDataUri(): Promise<string> {
  if (markDataUriCache) return markDataUriCache;
  const filePath = path.join(process.cwd(), "public", "brand", "verified-badge-mark-black.png");
  const buf = await fs.readFile(filePath);
  markDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  return markDataUriCache;
}

async function imageResponseToBuffer(res: ImageResponse): Promise<Buffer> {
  return Buffer.from(await res.arrayBuffer());
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
  const [markDataUri, qrDataUrl] = await Promise.all([
    loadMarkDataUri(),
    QRCode.toDataURL(verifyUrl, { width: 200, margin: 0, color: { dark: "#0f172a", light: "#00000000" } }),
  ]);

  const width = 300;
  const height = 130;

  const res = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          paddingTop: 15,
          backgroundColor: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori's
            renderer, not the browser DOM; next/image doesn't apply here. */}
        <img src={qrDataUrl} width={100} height={100} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri} width={26} height={26} alt="" />
          <div style={{ display: "flex", marginTop: 8, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
            Scan to verify
          </div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 9, color: "#64748b" }}>{shortLabel(verifyUrl)}</div>
          <div style={{ display: "flex", marginTop: 2, fontSize: 9, color: "#64748b" }}>
            Genuine, unaltered document
          </div>
        </div>
      </div>
    ),
    { width, height }
  );

  return imageResponseToBuffer(res);
}

/** The full standalone "Badge" asset — a shareable seal meant to be reused
 *  across many contexts (invoice footer, portfolio site, email signature),
 *  not tied to one PDF page layout. Incorporates the QR (linking to the
 *  per-document ledger page), the SignedBy mark, and the verification URL
 *  as visible text, so it reads as legitimate even printed or screenshotted,
 *  not only when scanned (VERIFIED_BADGE_SCOPE.md #5). */
export async function generateVerifiedBadgeImage(verifyUrl: string): Promise<Buffer> {
  const [markDataUri, qrDataUrl] = await Promise.all([
    loadMarkDataUri(),
    QRCode.toDataURL(verifyUrl, { width: 420, margin: 1, color: { dark: "#0f172a", light: "#ffffffff" } }),
  ]);

  const width = 640;
  const height = 820;
  const label = shortLabel(verifyUrl);

  const res = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          border: "2px solid #e2e8f0",
          borderRadius: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 48, marginLeft: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri} width={72} height={72} alt="" />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#0f172a" }}>SignedBy</div>
            <div
              style={{
                display: "flex",
                marginTop: 4,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 1.5,
                color: "#475569",
              }}
            >
              VERIFIED &amp; SEALED
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 22, marginLeft: 40, width: width - 80, height: 1.5, backgroundColor: "#e2e8f0" }} />

        <div style={{ display: "flex", justifyContent: "center", marginTop: 44 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} width={420} height={420} alt="" />
        </div>

        {/* marginTop 22 -> 38 (2026-08-02, direct ask: more breathing room
            between the QR and the "Scan or visit to verify" line below it —
            the badge read as cramped with the two sitting close together). */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 38 }}>
          <div style={{ display: "flex", fontSize: 17, fontWeight: 600, color: "#0f172a" }}>Scan or visit to verify</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 14, color: "#475569" }}>{label}</div>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* FIXED 2026-08-01: previously read "Timestamp and identity
            cryptographically verified" — not accurate. The hash (SHA-512
            over the stamped document, see generate-signed-pdf.ts) and the
            identity check (real Stripe Identity govt-ID + selfie, see
            identity.ts) are genuinely cryptographic; the timestamp itself
            is a plain Postgres `created_at` value with no trusted
            timestamping authority or other independent proof of time
            behind it — nothing in this codebase does RFC 3161 timestamping
            or blockchain anchoring today. Reworded to only claim crypto
            verification for the two things that actually have it, matching
            the more careful language the certificate PDF page already
            used ("reflects the identity check and file hash captured at
            the time of sealing" — see generate-signed-pdf.ts). */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
          <div style={{ display: "flex", fontSize: 10.5, color: "#94a3b8", textAlign: "center" }}>
            Unaltered since sealed. File hash and identity cryptographically verified.
          </div>
        </div>
      </div>
    ),
    { width, height }
  );

  return imageResponseToBuffer(res);
}
