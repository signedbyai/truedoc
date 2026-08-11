import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";

// Variant-D-only sibling of generate-hero-verified-badge-invoice.tsx, split
// out 2026-08-09 (direct ask): "remove the large green tick and move up the
// wax seal to the top right of the invoice covering part of the A. Marlowe
// Design name, so the entire word design is hidden." No tick badge
// anywhere in this image (neither above the QR like A/B/C, nor at the top
// of the card like E) -- the wax-seal medallion itself (already carries its
// own green tick baked into its top-right corner, see
// public/verified-seal-badge.png) is composited directly into this canvas
// instead, stamped over the top-right of the card so it covers "Design" in
// the company name.
//
// Baked directly into the generated PNG rather than a CSS overlay in
// page.tsx (unlike the bottom-right medallion used for variant E) because
// this needed pixel-accurate placement against this specific image's own
// text layout -- easiest to get right (and verify by eye) inside the same
// script that lays out that text, rather than guessing coordinates against
// a separately-rendered flat image from the DOM side.
//
// Enlarged 2026-08-09 (direct ask, reference screenshot attached): "much
// larger" and "appear to be floating outside the edge of the document" --
// first pass (88px, tucked mostly inside the card) read as a small corner
// icon, not a stamped seal. Now 240px, centered squarely on the card's own
// top-right corner point so roughly half the medallion hangs in the blank
// margin outside the card. That corner sits at a fixed (600, cardTop) in
// canvas coordinates regardless of outer padding (40px left padding + 560
// card width), so the seal is now positioned relative to the CARD itself
// (needs its own position:relative) rather than the header text column --
// simpler anchor, and correct now that the seal is bigger than the column.
// The canvas gained extra top/right padding (140 vs the shared image's 40)
// purely to give the oversized, overhanging seal room before it'd get
// clipped by the PNG's own edge -- card width/height are unchanged (still
// 560x740) so its content layout matches every other variant.

const WIDTH = 740;
const HEIGHT = 650;
const OUTER_PAD_TOP = 140;
const OUTER_PAD_RIGHT = 140;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";

async function main() {
  // Same QR settings as the shared generator -- see that file's own
  // comment for why (bigger source render + margin, needed for the QR to
  // survive downscaling into the card and then again into the pitch deck).
  const verifyUrl = "https://signedby.ai/verified-badge-invoices";
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: NAVY, light: "#ffffffff" },
  });

  const sealBuf = await fs.readFile(path.join(process.cwd(), "public", "verified-seal-badge.png"));
  const sealDataUri = `data:image/png;base64,${sealBuf.toString("base64")}`;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          // White, not the shared image's #f8fafc -- this canvas has a lot
          // of extra blank margin now (for the seal to float in), and
          // page.tsx renders this one WITHOUT its usual rounded-border
          // wrapper (see that file's comment) so the margin needs to melt
          // into the page's own bg-white instead of showing as a visible
          // tinted rectangle.
          backgroundColor: "#ffffff",
          paddingTop: OUTER_PAD_TOP,
          paddingRight: OUTER_PAD_RIGHT,
          paddingBottom: 40,
          paddingLeft: 40,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            borderRadius: 20,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 20px 45px -20px rgba(15, 23, 42, 0.25)",
            padding: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>Invoice</div>
              <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: MUTED }}>INV-0148</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: NAVY }}>A. Marlowe Design</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 13, color: MUTED }}>Freelance Brand Design</div>
            </div>
          </div>

          {/* Wax-seal medallion, stamped over the card's own top-right
              corner so it hangs off the edge of the document -- direct
              ask, 2026-08-09 (see file header comment). 240px, centered on
              the corner point (top:-120/right:-120, half its own diameter
              each direction) so roughly half floats outside the card into
              the canvas's blank margin, the other half overlaps the
              company name -- covers "Design" and reaches into "Marlowe"
              and the tagline line below it too now that it's this much
              bigger, an accepted side effect of "much larger" per the
              request. */}
          <img
            src={sealDataUri}
            width={240}
            height={240}
            alt=""
            style={{ position: "absolute", top: -120, right: -120 }}
          />

          <div style={{ marginTop: 28, display: "flex", height: 1, backgroundColor: BORDER }} />

          <div style={{ marginTop: 22, display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>BILL TO</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 14, color: NAVY }}>Nordwind Studio GmbH</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>DATE</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 14, color: NAVY }}>Aug 6, 2026</div>
            </div>
          </div>

          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["Brand identity — final deliverables", "€2,400.00"],
              ["Style guide & asset package", "€650.00"],
            ].map(([label, amount]) => (
              <div key={label} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 14 }}>
                <div style={{ display: "flex", fontSize: 14, color: SLATE }}>{label}</div>
                <div style={{ display: "flex", fontSize: 14, color: NAVY }}>{amount}</div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: NAVY }}>Total due</div>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: NAVY }}>€3,050.00</div>
            </div>
          </div>

          {/* 2026-08-12, direct ask: trim the dead gap between Total due
              and the QR row -- was `flex: 1` on a card that itself also had
              `flex: 1` (filling the whole padded canvas), so the QR row got
              pushed all the way to the canvas's own bottom edge regardless
              of how little content was above it. Card no longer stretches
              (flex:1 removed above too) and this is now a fixed gap sized
              to the content, not the canvas. */}
          <div style={{ marginTop: 32 }} />

          {/* No tick badge here -- the seal stamped up top already reads as
              this image's verified indicator (direct ask). Plain QR. */}
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", gap: 12 }}>
            <div style={{ display: "flex", width: 96, height: 96 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
              <img src={qrDataUrl} width={96} height={96} alt="" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, backgroundColor: NAVY }} />
                <div style={{ display: "flex", fontSize: 13, fontWeight: 600, color: NAVY }}>Verified &amp; sealed</div>
              </div>
              <div style={{ marginTop: 3, display: "flex", fontSize: 10.5, color: MUTED }}>signedby.ai/verified-badge-invoices</div>
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
  const outPath = path.join(process.cwd(), "public", "hero-verified-badge-invoice-d.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
