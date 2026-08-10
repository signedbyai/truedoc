// Seal-only variant of marketing/linkedin-ads/verified-badge-invoice-ad.png
// (direct ask, 2026-08-10: "Also make a variant of this ad with just the
// Seal images like variant F of our CTA" — verified-badge-invoices'
// pill+CTA copy test variant F drops the invoice mockup entirely and shows
// just a large public/verified-seal-badge.png, since that medallion
// already carries its own green tick baked into its top-right corner; see
// verified-badge-invoices/page.tsx's ctaVariant === "F" branch).
//
// Same left-side copy/logo/CTA and 1200x627 canvas as
// generate-linkedin-ad-verified-badge-invoice-d.tsx (which see for why
// that script exists at all — the original ad's generator was never
// committed). Only the right side changes: no invoice card, just the seal.
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 627;

async function dataUri(relPath: string): Promise<string> {
  const buf = await fs.readFile(path.join(process.cwd(), "public", relPath));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function main() {
  const [logo, seal] = await Promise.all([
    dataUri("brand/verified-badge-mark-black.png"),
    dataUri("verified-seal-badge.png"),
  ]);

  // verified-seal-badge.png is a 1333x1333 square — sized large enough to
  // read clearly as the ad's whole visual anchor (no invoice card next to
  // it to establish scale against), while still leaving comfortable
  // margins inside the 627-tall canvas (64px top/bottom padding).
  const SEAL_SIZE = 440;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#ffffff",
          padding: 64,
        }}
      >
        {/* Left: copy — identical to generate-linkedin-ad-verified-badge-invoice-d.tsx. */}
        <div style={{ display: "flex", flexDirection: "column", width: 560, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires plain <img>, not next/image; this is a static generator script, not app UI */}
            <img src={logo} alt="" width={56} height={56} style={{ borderRadius: 14 }} />
            <span style={{ fontSize: 28, fontWeight: 600, color: "#0f172a", display: "flex" }}>SignedBy</span>
          </div>
          <span style={{ marginTop: 28, fontSize: 46, fontWeight: 700, color: "#0f172a", lineHeight: 1.15, letterSpacing: -0.5, display: "flex" }}>
            AI can fake an invoice in seconds. Prove yours is genuinely you.
          </span>
          <span style={{ marginTop: 22, fontSize: 22, color: "#475569", lineHeight: 1.4, display: "flex" }}>
            Seal it first. Clients can check it&apos;s really from you — unaltered, identity-verified.
          </span>
          <div
            style={{
              marginTop: 34,
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "#fde047",
              color: "#0f172a",
              fontSize: 24,
              fontWeight: 600,
              padding: "16px 32px",
              borderRadius: 999,
            }}
          >
            Try Verified Badge free →
          </div>
          <span style={{ marginTop: 20, fontSize: 18, color: "#94a3b8", display: "flex" }}>signedby.ai/verified-badge-invoices</span>
        </div>

        {/* Right: just the seal, no invoice card — F's whole point. */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
          <img src={seal} alt="" width={SEAL_SIZE} height={SEAL_SIZE} style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "..", "marketing", "linkedin-ads", "verified-badge-invoice-ad-seal-only.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
