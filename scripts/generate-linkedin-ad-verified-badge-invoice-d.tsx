// Rebuild of marketing/linkedin-ads/verified-badge-invoice-ad.png (direct
// ask, 2026-08-10: "Make a new version of this linkedin ad... using the new
// seal invoice image attached... Replacing the old invoice image in the
// ad."). The generator script that originally produced this PNG was never
// committed (a one-off npx tsx run, confirmed absent from repo history) —
// this rebuilds it from scratch at the same 1200x627 canvas, same left-side
// copy/logo/CTA (verified against the existing PNG directly since the
// original source text wasn't available either), same house style as
// generate-linkedin-ad-boat-jet-ski-rental.tsx (next/og's ImageResponse,
// Satori + resvg).
//
// The only real change: the right-side card was previously a crop out of
// the Reddit portrait creative (a small invoice mockup with a tiny green
// tick by the QR). It's now the CTA-test's variant-D hero image
// (public/hero-verified-badge-invoice-d.png, see
// generate-hero-verified-badge-invoice-d.tsx) — the large wax-seal
// medallion stamped over the invoice's top-right corner, floating outside
// the card's own edge. That image already has its own white background and
// card shadow baked in (built specifically to NOT need a wrapping
// card/shadow container — see verified-badge-invoices/page.tsx's D-branch
// comment), so it's placed directly rather than cropped/framed again here.
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
  const [logo, sealedInvoice] = await Promise.all([
    dataUri("brand/verified-badge-mark-black.png"),
    dataUri("hero-verified-badge-invoice-d.png"),
  ]);

  // hero-verified-badge-invoice-d.png is 740x920 — sized here so the
  // invoice CARD within it (which occupies ~76% of that image's own width,
  // the rest being blank margin for the seal to float in) reads at roughly
  // the same on-page size as the original ad's ~280px-wide card.
  const DISPLAY_H = 480;
  const DISPLAY_W = Math.round((DISPLAY_H * 740) / 920);

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
        {/* Left: copy — matches the existing ad verbatim (verified by
            direct inspection of the current PNG, since no source script
            existed to read the text back out of). */}
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

        {/* Right: the new sealed-invoice hero, placed directly (no
            wrapping card/shadow container — see file header comment). */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
          <img src={sealedInvoice} alt="" width={DISPLAY_W} height={DISPLAY_H} style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "..", "marketing", "linkedin-ads", "verified-badge-invoice-ad.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
