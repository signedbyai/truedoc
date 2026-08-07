// One-off generator for marketing/linkedin-ads/boat-jet-ski-rental-phone-ad.png
// (1200x627), run via:
//   npx tsx scripts/generate-linkedin-ad-boat-jet-ski-rental.tsx
//
// Same house style as auto-sales-phone-ad.png (per its own doc comment in
// marketing/linkedin-ad-auto-sales.md): logo, headline, subtext, CTA pill,
// URL on the left; the page's own hero composition (document mockup +
// hero-signer-mobile.png overlapping its corner) on the right — not a new
// invented layout. Uses next/og's ImageResponse (Satori + resvg), same
// renderer as every opengraph-image.tsx/badge-asset.tsx in this app.
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
  const [logo, doc, phone] = await Promise.all([
    dataUri("brand/signedby-lockup-yellow-badge-beta-micro-small.png"),
    dataUri("hero-boat-jet-ski-rental.png"),
    dataUri("hero-signer-mobile.png"),
  ]);

  // Native aspect ratios, computed at render time rather than hardcoded a
  // second time — hero-boat-jet-ski-rental.png is 1562x1070 (1.46:1),
  // hero-signer-mobile.png is 1236x2370 (0.52:1).
  const DOC_W = 520;
  const DOC_H = Math.round((DOC_W * 1070) / 1562);
  const PHONE_W = 160;
  const PHONE_H = Math.round((PHONE_W * 2370) / 1236);

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
        {/* Left: copy */}
        <div style={{ display: "flex", flexDirection: "column", width: 560, justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires plain <img>, not next/image; this is a static generator script, not app UI */}
          <img src={logo} alt="" width={150} height={36} style={{ objectFit: "contain" }} />
          <span style={{ marginTop: 28, fontSize: 46, fontWeight: 700, color: "#0f172a", lineHeight: 1.15, letterSpacing: -0.5, display: "flex" }}>
            Stop losing weekend revenue to paperwork.
          </span>
          <span style={{ marginTop: 22, fontSize: 22, color: "#475569", lineHeight: 1.4, display: "flex" }}>
            Boat and jet ski rental agreements, signed on a phone at the counter.
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
            Start for free →
          </div>
          <span style={{ marginTop: 20, fontSize: 18, color: "#94a3b8", display: "flex" }}>signedby.ai/boat-jet-ski-rental</span>
        </div>

        {/* Right: hero composition */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", display: "flex", width: DOC_W, height: DOC_H }}>
            <div
              style={{
                display: "flex",
                width: DOC_W,
                height: DOC_H,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 20px 45px -15px rgba(15,23,42,0.25)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
              <img src={doc} alt="" width={DOC_W} height={DOC_H} style={{ objectFit: "cover" }} />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -28,
                right: -20,
                display: "flex",
                width: PHONE_W,
                height: PHONE_H,
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 15px 30px -10px rgba(15,23,42,0.3)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
              <img src={phone} alt="" width={PHONE_W} height={PHONE_H} style={{ objectFit: "cover" }} />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "..", "marketing", "linkedin-ads", "boat-jet-ski-rental-phone-ad.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
