// One-off generator for public/hero-boat-jet-ski-rental.png, run via:
//   npx tsx scripts/generate-hero-boat-jet-ski-rental.tsx
//
// Same approach as auto-sales's hero (generate-hero-auto-sales-v2.tsx,
// not committed — this one IS committed so it can be re-run if the mockup
// ever needs a copy tweak): next/og's ImageResponse (Satori + resvg), the
// same renderer every opengraph-image.tsx and badge-asset.tsx already use
// in this app — no browser/Chromium/root install needed, which the sandbox
// doesn't have (see [[sandbox-next-build-workflow]]).
//
// 1562x1070 matches hero-field-editor.png/hero-auto-sales.png exactly, so
// it drops into the same wrapper div (rounded corners/border/shadow are
// applied by the *page*, not baked into this PNG — see homepage-current.tsx)
// without any layout changes on the boat-jet-ski-rental page.
//
// Content mirrors hero-auto-sales.png's shape (filename bar, title, status
// pill, item subheading, line-item price breakdown, highlighted signature
// field) rather than inventing new visual language — the late-return fee
// line ($50, matching the real Sicilian contract this template was built
// from) is a deliberate callback to the page's own FAQ answer about it.
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1562;
const HEIGHT = 1070;

async function main() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          padding: 48,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 30px 60px -20px rgba(15, 23, 42, 0.25)",
          }}
        >
          {/* Filename bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "20px 32px",
              backgroundColor: "#eef2f7",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#cbd5e1", display: "flex" }} />
            ))}
            <span style={{ marginLeft: 8, fontSize: 20, color: "#64748b" }}>boat-jet-ski-rental-agreement.pdf</span>
          </div>

          {/* Document body */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 48px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 }}>
                  Boat & Jet Ski Rental Agreement
                </span>
                <span style={{ marginTop: 8, fontSize: 22, color: "#64748b" }}>Marina Del Sol Rentals · Aug 7, 2026</span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "#334155",
                  backgroundColor: "#f1f5f9",
                  padding: "10px 20px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                Awaiting signature
              </div>
            </div>

            <div style={{ marginTop: 32, borderTop: "1px solid #e2e8f0", display: "flex" }} />

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, color: "#64748b" }}>Vessel</span>
              <span style={{ marginTop: 6, fontSize: 30, fontWeight: 600, color: "#0f172a" }}>Yamaha VX Cruiser Jet Ski</span>
              <span style={{ marginTop: 6, fontSize: 20, color: "#94a3b8" }}>Hull ID YMA-4021 · Half-day rental</span>
            </div>

            <div style={{ marginTop: 28, borderTop: "1px solid #e2e8f0", display: "flex" }} />

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                ["Rental price", "$180.00"],
                ["Security deposit", "$300.00"],
                ["Late-return fee", "$50.00"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 22, color: "#475569" }}>{label}</span>
                  <span style={{ fontSize: 22, color: "#0f172a" }}>{value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 600, color: "#0f172a" }}>Total due at handover</span>
                <span style={{ fontSize: 24, fontWeight: 600, color: "#0f172a" }}>$530.00</span>
              </div>
            </div>

            <div style={{ display: "flex", flex: 1 }} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                alignSelf: "flex-start",
                backgroundColor: "#fefce8",
                border: "2px dashed #fde047",
                borderRadius: 10,
                padding: "14px 22px",
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#eab308", display: "flex" }} />
              <span style={{ fontSize: 22, color: "#854d0e" }}>Renter signature field</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const buf = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-boat-jet-ski-rental.png");
  await fs.writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
