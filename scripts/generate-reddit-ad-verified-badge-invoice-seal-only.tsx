// Reddit version of the invoice-fraud angle's "Variant F" (seal-only)
// treatment — same copy/destination as
// verified-badge-invoice-fraud-campaign/verified-badge-invoice-fraud-campaign.md's
// existing portrait ad (verified-badge-reddit-portrait-invoice-fraud.png),
// but drops the in-context invoice mockup entirely and shows just the large
// public/verified-seal-badge.png medallion as the sole visual — mirroring
// what generate-linkedin-ad-verified-badge-invoice-seal-only.tsx did for the
// LinkedIn ad (direct ask, 2026-08-11: "Make a Reddit version of variant F
// of the invoice CTA, showing the Badge with the large seal").
//
// Same 1080x1350 stacked template as every other Reddit portrait ad in this
// campaign (logo, headline, subhead, centered visual, full-width yellow CTA
// pill, URL) — see generate-reddit-ad-boat-jet-ski-rental.tsx for the most
// recent sibling using this exact layout.
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
  const [logo, seal] = await Promise.all([
    dataUri("brand/signedby-lockup-yellow-badge-beta-micro-small.png"),
    dataUri("verified-seal-badge.png"),
  ]);

  // verified-seal-badge.png is a 1333x1333 square. Sized to be the whole
  // visual anchor (no invoice card next to it to set scale against) while
  // leaving room for the headline/subhead above and the CTA pill below.
  const SEAL_SIZE = 700;

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
            fontSize: 52,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.15,
            letterSpacing: -0.5,
            display: "flex",
            maxWidth: 950,
          }}
        >
          AI can fake an invoice in seconds. Prove yours is genuinely you.
        </span>
        <span style={{ marginTop: 24, fontSize: 26, color: "#475569", lineHeight: 1.4, display: "flex", maxWidth: 880 }}>
          Seal it first. Clients can check it&apos;s really from you — unaltered, identity-verified.
        </span>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see logo comment above */}
          <img src={seal} alt="" width={SEAL_SIZE} height={SEAL_SIZE} style={{ objectFit: "contain" }} />
        </div>

        <div
          style={{
            marginTop: 24,
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
          Try Verified Badge free →
        </div>
        <span style={{ marginTop: 20, fontSize: 22, color: "#94a3b8", display: "flex" }}>signedby.ai/verified-badge-invoices</span>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outDir = path.join(process.cwd(), "..", "verified-badge-invoice-fraud-campaign");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "reddit-portrait-invoice-fraud-seal-only.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
