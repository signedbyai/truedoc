import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";

// Rebuild of the pitch deck's SEAL-slide hero (direct report, 2026-08-08:
// "The QR codes in the slides ... give me 404's or errors" -- this one's
// QR failed to even decode, and no source script for the original
// existed in this session to just patch the URL in). Recreated to match
// the original stylized invoice mockup (Invoice / INV-0148 / A. Marlowe
// Design / Nordwind Studio GmbH / line items / Total due / QR + "Verified
// & sealed" badge, 640x820) with a real, working QR payload this time --
// the visible label under the QR already read
// "signedby.ai/verified-badge-invoices", so the QR now actually encodes
// that same real, live page (direct instruction: home page or a CTA page
// is a fine destination, no need for a fake per-document link).
//
// Added 2026-08-08 (direct ask, same session): a large green checkmark
// badge, "to give the impression that it's verified" -- a purely visual
// trust cue on this illustrative hero mockup, same green/white "verified"
// badge convention used all over the web (App Store ratings, marketplace
// seller badges, etc.). Not meant to represent any real in-product UI
// element -- the real badge's own verified state is the QR + "Verified &
// sealed" text already in this mockup; this is additive polish on the
// marketing hero only. Enlarged twice same day (40/32/20 -> 58/46/28 ->
// 84/66/42 outer/inner/icon), originally sat floating above the QR's
// top-right corner.
//
// Moved 2026-08-09 (direct ask) from beside the QR (bottom of this tall
// 820px mockup) to the top header row, centered between "Invoice" and the
// client name -- on mobile this card renders at ~90vw (see
// verified-badge-invoices/page.tsx's <Image sizes>) below a fair amount of
// hero copy/pill/CTA above it, so the QR-area badge was landing below the
// fold on first load; the header is the first thing visible once this
// section scrolls into view at all. No QR-overlap constraint to worry
// about anymore at this new spot (see git history on this file for the
// two failed QR-overlapping placements that motivated floating it clear
// in the first place -- moot now that it isn't next to the QR).

const WIDTH = 640;
const HEIGHT = 820;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";

async function main() {
  // width:120/margin:0 (this file's first version) rendered a QR too
  // small and with too thin a quiet zone to reliably scan once
  // downscaled into the card layout below, then downscaled again once
  // embedded in the pitch deck -- confirmed by testing: cv2's QR
  // detector, which decodes a plain full-size QR of the same URL just
  // fine, failed on that version entirely. Bigger source render + a
  // proper margin + a bigger on-card display size (96 vs 64) fixes it.
  const verifyUrl = "https://signedby.ai/verified-badge-invoices";
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: NAVY, light: "#ffffffff" },
  });

  const checkIconBuf = await fs.readFile(
    path.join(process.cwd(), "public", "deck-icons", "Check-white.png")
  );
  const checkIconDataUri = `data:image/png;base64,${checkIconBuf.toString("base64")}`;

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
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>Invoice</div>
              <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: MUTED }}>INV-0148</div>
            </div>
            {/* Centered green "verified" tick -- see file header comment
                for why this moved here from beside the QR (2026-08-09,
                mobile above-the-fold visibility). flex:1 on both text
                columns keeps this true-centered regardless of how long
                either side's text is, rather than justify-content:
                space-between, which would only center it by coincidence. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 10px -2px rgba(15, 23, 42, 0.35)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  backgroundColor: "#16a34a",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
                <img src={checkIconDataUri} width={34} height={34} alt="" />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: NAVY }}>A. Marlowe Design</div>
              <div style={{ marginTop: 4, display: "flex", fontSize: 13, color: MUTED }}>Freelance Brand Design</div>
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
  const outPath = path.join(process.cwd(), "public", "hero-verified-badge-invoice.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
