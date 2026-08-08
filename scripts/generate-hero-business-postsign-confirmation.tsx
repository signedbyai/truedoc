import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Hero for the pitch deck's new "Designed for business" slide (direct ask,
// 2026-08-08) — the "post signing" half, paired with
// generate-hero-business-presign-header.tsx's pre-doc-load header. Recreates
// the real end screen (src/components/signing-view.tsx, ~line 918 on):
// endScreenLogo, the "Signed" card, the amber payment block
// (payment.label + "Pay now", ~line 1032), and the amber DocGate block
// ("Everyone has signed — your access link is ready" + the
// next-step-highlight yellow-underline button, ~line 1052) — the two
// Business-tier-only moments that fire right after a signer finishes,
// alongside the same client branding as the header mockup (same logo mark,
// same violet, same "Meridian Legal" — deliberately consistent across both
// images since they're two moments in one signer's session).
const WIDTH = 640;
const HEIGHT = 820;
const ACCENT = "#7c3aed";
const SLATE_900 = "#0f172a";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748b";
const BORDER = "#e2e8f0";
const AMBER_BORDER = "#fde68a";
const AMBER_BG = "#fffbeb";
const AMBER_TEXT = "#78350f";
const AMBER_BTN = "#d97706";

async function main() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 560,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 20px 45px -20px rgba(15, 23, 42, 0.25)",
            padding: 44,
          }}
        >
          {/* endScreenLogo — same client mark as the header mockup */}
          <div
            style={{
              display: "flex",
              alignSelf: "center",
              width: 52,
              height: 52,
              borderRadius: 10,
              backgroundColor: ACCENT,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            M
          </div>

          <div style={{ display: "flex", alignSelf: "center", marginTop: 20, fontSize: 24, fontWeight: 700, color: SLATE_900 }}>
            Signed
          </div>
          <div style={{ display: "flex", alignSelf: "center", marginTop: 10, fontSize: 15, color: SLATE_600, textAlign: "center" }}>
            Thanks, J. Ortiz — your signature has been recorded.
          </div>

          <div
            style={{
              display: "flex",
              alignSelf: "center",
              marginTop: 22,
              backgroundColor: SLATE_900,
              borderRadius: 8,
              padding: "12px 22px",
              fontSize: 15,
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            Download signed PDF
          </div>

          {/* Payment block — Business-tier paymentCollection, real copy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 22,
              borderRadius: 8,
              border: `1px solid ${AMBER_BORDER}`,
              backgroundColor: AMBER_BG,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", fontSize: 13, color: AMBER_TEXT }}>
              A payment of $1,200.00 is requested for this document.
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginTop: 10,
                backgroundColor: AMBER_BTN,
                borderRadius: 8,
                padding: "9px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Pay now
            </div>
          </div>

          {/* DocGate block — Business-tier docGate, real copy + the
              next-step-highlight yellow-underline treatment (globals.css),
              recreated here as a literal yellow bar under the label since
              Satori doesn't render CSS ::after sweeps. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 16,
              borderRadius: 8,
              border: `1px solid ${AMBER_BORDER}`,
              backgroundColor: AMBER_BG,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", fontSize: 13, color: AMBER_TEXT }}>
              Everyone has signed — your access link is ready.
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignSelf: "flex-start",
                marginTop: 10,
                border: `1px solid #cbd5e1`,
                backgroundColor: "#ffffff",
                borderRadius: 8,
                padding: "9px 20px",
              }}
            >
              <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: SLATE_900 }}>
                Client Portal Access
              </div>
              <div style={{ display: "flex", marginTop: 3, width: 132, height: 3, borderRadius: 2, backgroundColor: "#facc15" }} />
            </div>
          </div>

          <div style={{ display: "flex", alignSelf: "center", marginTop: 20, fontSize: 12, color: SLATE_500, textAlign: "center" }}>
            Still Meridian Legal's logo, colors, and next step — end to end.
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-business-postsign-confirmation.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
