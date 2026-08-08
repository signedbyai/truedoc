import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";

// Rebuild of /verified-badge-real-estate's hero (also reused as its
// opengraph-image.tsx share card -- both load this exact file from disk).
// Direct follow-up ask, 2026-08-08: "yes fix the /verified-badge-real-estate
// issue also" -- found while checking the pitch deck's QR codes for the
// same class of bug already fixed once on /verified-badge (fake hash) and
// once on /verified-badge-invoices (undersized QR, see
// generate-hero-verified-badge-invoice.tsx). This one was the same
// undersized-QR problem as the invoices page, never fixed before: the QR
// itself was a correct, real link to signedby.ai/verified-badge-real-estate
// (matching the visible label under it), just too small and thin a quiet
// zone to reliably scan once embedded in the card and downscaled again on
// the page -- confirmed via cv2's QR detector returning empty on the
// original file entirely.
//
// Same fix as the invoices page: bigger source render (300px, margin 2)
// and a bigger on-card display size (96 vs whatever the original used),
// same closing-statement mockup content (Closing Statement / 142 Ridgeview
// Lane / Sunrise Title & Escrow / Licensed Settlement Agent / BUYER: R. &
// M. Alvarez / CLOSING DATE: Aug 14, 2026 / Down payment $86,000.00 /
// Closing costs & fees $4,250.00 / Total due at closing $90,250.00),
// recreated to match the shipped visual since no source script for the
// original existed in this repo.

const WIDTH = 640;
const HEIGHT = 820;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";

async function main() {
  const verifyUrl = "https://signedby.ai/verified-badge-real-estate";
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: NAVY, light: "#ffffffff" },
  });

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            backgroundColor: "#ffffff",
            borderRadius: 20,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 20px 45px -20px rgba(15, 23, 42, 0.25)",
            padding: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>Closing Statement</div>
              <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: MUTED }}>142 Ridgeview Lane</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: NAVY }}>Sunrise Title &amp; Escrow</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 13, color: MUTED }}>Licensed Settlement Agent</div>
            </div>
          </div>

          <div style={{ marginTop: 28, display: "flex", height: 1, backgroundColor: BORDER }} />

          <div style={{ marginTop: 22, display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>BUYER</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 14, color: NAVY }}>R. &amp; M. Alvarez</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>CLOSING DATE</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 14, color: NAVY }}>Aug 14, 2026</div>
            </div>
          </div>

          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["Down payment", "$86,000.00"],
              ["Closing costs & fees", "$4,250.00"],
            ].map(([label, amount]) => (
              <div key={label} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 14 }}>
                <div style={{ display: "flex", fontSize: 14, color: SLATE }}>{label}</div>
                <div style={{ display: "flex", fontSize: 14, color: NAVY }}>{amount}</div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: NAVY }}>Total due at closing</div>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: NAVY }}>$90,250.00</div>
            </div>
          </div>

          <div style={{ display: "flex", flex: 1 }} />

          <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
            <img src={qrDataUrl} width={96} height={96} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, backgroundColor: NAVY }} />
                <div style={{ display: "flex", fontSize: 13, fontWeight: 600, color: NAVY }}>Verified &amp; sealed</div>
              </div>
              <div style={{ marginTop: 3, display: "flex", fontSize: 10.5, color: MUTED }}>signedby.ai/verified-badge-real-estate</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  return image;
}

async function run() {
  const res = await main();
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-verified-badge-real-estate.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
