import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Hero for the pitch deck's new "Designed for business" slide (direct ask,
// 2026-08-08): "the pre-signing and post-signing brand and ad placement
// opportunity ... a hero shot that would show the pre-doc-load placement
// and the post signing current image." This is the "pre-doc-load"
// half — the signer's very first view, before they've opened/scrolled the
// document at all.
//
// Recreates the real sticky signing header (src/components/signing-view.tsx,
// ~line 1082 on): logo + "Sent by {org}" + doc title on the left, the
// accent-coloured 2px bottom border that appears whenever a Business-tier
// org sets a brand color (accentColor, same file), and the real right-hand
// button cluster (field-progress badge, "What am I signing?", "Decline to
// sign", "Sign & submit" — the submit button also gets the org's accent
// color). Uses a deliberately generic client name/color (Meridian Legal,
// violet) rather than SignedBy's own yellow, so the point ("this is THEIR
// brand, not ours") reads clearly rather than looking like our own UI.
const WIDTH = 1400;
const HEIGHT = 280;
const ACCENT = "#7c3aed"; // stand-in client brand color, deliberately not SignedBy's yellow
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const BORDER = "#e2e8f0";

async function main() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderBottom: `5px solid ${ACCENT}`,
            boxShadow: "0 20px 45px -25px rgba(15, 23, 42, 0.35)",
            padding: "0 44px",
            height: 168,
          }}
        >
          {/* Left: client logo + sender attribution + doc title */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                width: 56,
                height: 56,
                borderRadius: 10,
                backgroundColor: ACCENT,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 17, color: SLATE_500 }}>
                Sent by Meridian Legal · Signing as J. Ortiz
              </div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 25, fontWeight: 600, color: SLATE_900 }}>
                Consulting Agreement
              </div>
            </div>
          </div>

          {/* Right: progress + actions, real button cluster */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 500, color: SLATE_500, whiteSpace: "nowrap" }}>
              3 of 4 fields done
            </div>
            <div
              style={{
                display: "flex",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 16,
                fontWeight: 600,
                color: SLATE_500,
                whiteSpace: "nowrap",
              }}
            >
              What am I signing?
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: SLATE_500, whiteSpace: "nowrap" }}>
              Decline to sign
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: ACCENT,
                borderRadius: 8,
                padding: "12px 26px",
                fontSize: 17,
                fontWeight: 600,
                color: "#ffffff",
                whiteSpace: "nowrap",
              }}
            >
              Sign &amp; submit
            </div>
          </div>
        </div>

        {/* Caption strip below the mockup */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            fontWeight: 600,
            color: SLATE_900,
          }}
        >
          Before they read a single field — it's Meridian Legal's page, not SignedBy's.
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-business-presign-header.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
