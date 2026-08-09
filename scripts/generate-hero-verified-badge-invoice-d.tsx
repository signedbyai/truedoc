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

const WIDTH = 640;
const HEIGHT = 820;
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
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>Invoice</div>
              <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: MUTED }}>INV-0148</div>
            </div>
            {/* position:relative wrapper so the seal below can anchor to
                this column's own top-right corner regardless of exactly
                how wide the rendered text is -- see file header comment. */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: NAVY }}>A. Marlowe Design</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 13, color: MUTED }}>Freelance Brand Design</div>
              {/* Wax-seal medallion, stamped over the top-right corner of
                  the company name so it covers "Design" -- direct ask,
                  2026-08-09. Sized/positioned by render-and-check (satori
                  text metrics aren't queryable ahead of time): 132px was
                  too big (swallowed "Marlowe" too), 92px at right:-10 still
                  clipped the tail of "Marlowe". 88px/right:-4 leaves "A.
                  Marlowe" fully clear while still fully covering "Design"
                  (and the tagline line below it, which the medallion's
                  lower arc reaches -- an accepted side effect, not
                  specifically called out either way). */}
              <img
                src={sealDataUri}
                width={88}
                height={88}
                alt=""
                style={{ position: "absolute", top: -4, right: -4 }}
              />
            </div>
          </div>

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

          <div style={{ display: "flex", flex: 1 }} />

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
