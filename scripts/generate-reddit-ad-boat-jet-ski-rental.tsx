// One-off generator for
// boat-jet-ski-rental-campaign/reddit-portrait-boat-jet-ski-rental-phone.png
// (1080x1350), run via:
//   npx tsx scripts/generate-reddit-ad-boat-jet-ski-rental.tsx
//
// Same stacked layout as reddit-portrait-auto-sales-phone.png (per its own
// doc comment in auto-sales-campaign/auto-sales-campaign.md): logo, then
// headline, then subtext, then the document-mockup+phone composite, then a
// full-width CTA pill, then the URL. Uses next/og's ImageResponse (Satori +
// resvg), same renderer as every opengraph-image.tsx/badge-asset.tsx here.
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1080;
const HEIGHT = 1350;

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

  const DOC_W = 700;
  const DOC_H = Math.round((DOC_W * 1070) / 1562);
  const PHONE_W = 210;
  const PHONE_H = Math.round((PHONE_W * 2370) / 1236);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires plain <img>, not next/image; this is a static generator script, not app UI */}
        <img src={logo} alt="" width={170} height={41} style={{ objectFit: "contain" }} />

        <span
          style={{
            marginTop: 40,
            fontSize: 56,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.15,
            letterSpacing: -0.5,
            display: "flex",
            maxWidth: 900,
          }}
        >
          Stop losing weekend revenue to paperwork.
        </span>
        <span style={{ marginTop: 24, fontSize: 26, color: "#475569", lineHeight: 1.4, display: "flex", maxWidth: 880 }}>
          Send the rental agreement — they sign and confirm their ID on their own phone before they leave the counter.
        </span>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 40 }}>
          <div style={{ position: "relative", display: "flex", width: DOC_W, height: DOC_H }}>
            <div
              style={{
                display: "flex",
                width: DOC_W,
                height: DOC_H,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 24px 50px -16px rgba(15,23,42,0.25)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
              <img src={doc} alt="" width={DOC_W} height={DOC_H} style={{ objectFit: "cover" }} />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -36,
                right: -26,
                display: "flex",
                width: PHONE_W,
                height: PHONE_H,
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 18px 36px -12px rgba(15,23,42,0.3)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
              <img src={phone} alt="" width={PHONE_W} height={PHONE_H} style={{ objectFit: "cover" }} />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fde047",
            color: "#0f172a",
            fontSize: 30,
            fontWeight: 600,
            padding: "22px 0",
            borderRadius: 999,
            width: "100%",
          }}
        >
          Start for free →
        </div>
        <span style={{ marginTop: 20, fontSize: 22, color: "#94a3b8", display: "flex" }}>signedby.ai/boat-jet-ski-rental</span>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outDir = path.join(process.cwd(), "..", "boat-jet-ski-rental-campaign");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "reddit-portrait-boat-jet-ski-rental-phone.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
