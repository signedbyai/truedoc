// One-off generator for public/hero-boat-jet-ski-rental-qr-signing.png, run via:
//   npx tsx scripts/generate-hero-boat-jet-ski-rental-qr-signing.tsx
//
// Hero for /boat-jet-ski-rental/guide (2026-08-08, direct ask, revised same
// day to mobile): the guide's actual hero moment is "hand the renter your
// phone, they scan a QR code, they sign" -- that's the main
// operator-to-customer interaction for this vertical (in-person handoff at
// the dock, not an emailed link), and almost all operators are running this
// from their phone, not a desktop, so the hero is a portrait mobile shot
// rather than a browser-chrome desktop mockup.
//
// Bezel-less, edge-to-edge content -- same convention as the one other real
// mobile asset already in this guide (hero-signer-mobile.png): the page
// applies rounding/border/shadow via className, this PNG is just the app
// content at phone width.
//
// Two things had to both be visible in one shot per direct ask: (1) exactly
// which control the operator presses -- a "Tap here" callout pointing at
// the QR to sign button, so first-time operators aren't left guessing --
// and (2) what pressing it produces -- the real "Scan to open" bottom
// sheet from QrSigningLinkButton (src/components/qr-signing-link-button.tsx),
// same title/caption copy, with a real QR code (via the same `qrcode`
// package + toDataURL() call the live button uses, not a placeholder grid).
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";

const WIDTH = 1170;
const HEIGHT = 1300;
const YELLOW = "#eab308";
const YELLOW_BG = "#fefce8";
const YELLOW_BORDER = "#fde047";
const DARK = "#0f172a";

async function main() {
  // Was a fake demo document id (signedby.ai/sign/9f2e-boat-rental-demo) --
  // no such document exists, so scanning it hit a real error page (direct
  // report, 2026-08-08: "QR codes in the slides give me 404's or errors").
  // Repointed to the real, live /boat-jet-ski-rental page instead of a
  // fake per-document link -- confirmed fine by direct instruction
  // ("home page or one of the CTA pages" is an acceptable destination).
  const qrDataUrl = await QRCode.toDataURL("https://signedby.ai/boat-jet-ski-rental", {
    width: 380,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffffff" },
  });

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        }}
      >
        {/* App content, phone-width padding */}
        <div style={{ display: "flex", flexDirection: "column", padding: "56px 44px 0 44px" }}>
          <span style={{ fontSize: 22, color: "#94a3b8" }}>Jet Ski Rental Agreement · Signers</span>

          {/* Signer card */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "24px 26px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 26, fontWeight: 600, color: DARK }}>Jane Renter</span>
              <span style={{ marginTop: 4, fontSize: 19, color: "#94a3b8" }}>renter@email.com</span>
            </div>
            <span style={{ display: "flex", fontSize: 17, color: "#334155", backgroundColor: "#f1f5f9", padding: "8px 18px", borderRadius: 999 }}>
              Sent
            </span>
          </div>

          {/* "Tap here" callout, stacked directly above the button it points at */}
          <div style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: DARK, borderRadius: 999, padding: "12px 22px", whiteSpace: "nowrap" }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, border: "3px solid #eab308", display: "flex" }} />
              <span style={{ fontSize: 19, fontWeight: 600, color: "#ffffff" }}>Tap here to bring up the QR</span>
            </div>
            <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `11px solid ${DARK}`, display: "flex" }} />
          </div>

          {/* QR to sign -- primary action for the mobile handoff flow, so it's the big highlighted button, not one of three equal pills */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              border: `3px solid ${YELLOW}`,
              backgroundColor: YELLOW_BG,
              borderRadius: 16,
              padding: "22px 24px",
            }}
          >
            <div style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: "#854d0e", display: "flex" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "#854d0e" }}>QR to sign</span>
          </div>

          {/* Secondary actions, demoted below the primary QR button */}
          <div style={{ marginTop: 16, display: "flex", gap: 14 }}>
            {["Copy link", "Share to sign"].map((label) => (
              <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 14px" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: "#94a3b8", display: "flex" }} />
                <span style={{ fontSize: 17, color: "#334155" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* "Scan to open" bottom sheet, matching QrSigningLinkButton's live UI */}
        <div
          style={{
            marginTop: 70,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: "16px 40px 56px 40px",
            boxShadow: "0 -24px 48px -16px rgba(15, 23, 42, 0.2)",
          }}
        >
          <div style={{ width: 48, height: 5, borderRadius: 999, backgroundColor: "#e2e8f0", display: "flex" }} />
          <span style={{ marginTop: 20, fontSize: 26, fontWeight: 600, color: DARK, alignSelf: "flex-start" }}>Scan to open</span>
          <div style={{ marginTop: 20, display: "flex", padding: 14, backgroundColor: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the browser DOM */}
            <img src={qrDataUrl} width={380} height={380} alt="" />
          </div>
          <span style={{ marginTop: 20, fontSize: 18, color: "#64748b", textAlign: "center" }}>
            Their camera opens the same signing link — no app to hand over.
          </span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-boat-jet-ski-rental-qr-signing.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
