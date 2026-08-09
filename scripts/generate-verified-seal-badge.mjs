// Generates the circular "wax seal" verified badge for the D/E/F visual
// redesign on /verified-badge-invoices (2026-08-09, direct ask: "I'd like
// D, E and F to have also the full visual redesign" -- following the
// attached hero-section concept mockups, which use a coin/medallion-style
// seal instead of the plain green-tick-on-QR treatment the classic A/B/C
// layout uses).
//
// Plain SVG + sharp, NOT next/og's ImageResponse (Satori) like every other
// generated asset in this repo -- Satori has no way to curve text around a
// circle at all, and the curved "VERIFIED & SEALED" / "BY SIGNEDBY.AI" rim
// text is the whole point of a wax-seal look. sharp (already a dependency,
// see generate-deck-icons.mjs) rasterizes plain SVG fine.
//
// Curved text is placed character-by-character with individual rotate()
// transforms, NOT <textPath> (SVG's standard way to curve text along a
// path) -- tried textPath first and confirmed empirically that sharp's
// underlying SVG rasterizer renders plain <text> fine but silently drops
// <textPath> content entirely (tested in isolation before rewriting this).
// Per-glyph placement is more legwork but has no such gap.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";

const SIZE = 320;
const CX = 160;
const CY = 160;

// Places `text` as individually-rotated characters along a circle of the
// given radius, centered on angle `midAngleDeg`. Uses the standard SVG
// angle convention (0deg = 3 o'clock, 90deg = 6 o'clock, since y grows
// downward) -- so 270deg is the top of the circle, 90deg is the bottom.
//
// `direction` is "cw" (top arc: angle increases left-to-right through the
// top, char rotation = angle+90 keeps glyphs upright) or "ccw" (bottom
// arc: angle decreases left-to-right through the bottom, char rotation =
// angle-90 keeps glyphs upright instead of upside-down). Both signs were
// verified by rendering and visually checking, not derived blind.
function arcText(text, { cx, cy, radius, midAngleDeg, stepDeg, fontSize, color, direction }) {
  const chars = text.split("");
  const n = chars.length;
  const sign = direction === "cw" ? 1 : -1;
  let out = "";
  chars.forEach((ch, i) => {
    const angle = midAngleDeg + sign * (i - (n - 1) / 2) * stepDeg;
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const rotate = direction === "cw" ? angle + 90 : angle - 90;
    if (ch === " ") return;
    // XML-escape -- "&" in "VERIFIED & SEALED" broke sharp's XML parser
    // (caught the hard way: "no name" entity-ref error) before this.
    const escaped = ch.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    out += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotate.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})">${escaped}</text>`;
  });
  return out;
}

async function main() {
  const verifyUrl = "https://signedby.ai/verified-badge-invoices";
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 260,
    margin: 1,
    color: { dark: "#1e293b", light: "#ffffffff" },
  });

  // Reeded coin edge -- a ring of short radial notches just inside the
  // outer rim, the cheapest way to read as "embossed medallion" without
  // hand-building a true scalloped-circle path.
  const notchCount = 56;
  let notches = "";
  for (let i = 0; i < notchCount; i++) {
    const angle = (360 / notchCount) * i;
    notches += `<rect x="${CX - 1.5}" y="${CY - 151}" width="3" height="9" fill="#94a3b8" transform="rotate(${angle} ${CX} ${CY})" />`;
  }

  const topText = arcText("VERIFIED & SEALED", {
    cx: CX,
    cy: CY,
    radius: 103,
    midAngleDeg: 270,
    stepDeg: 10.5,
    fontSize: 15,
    color: "#475569",
    direction: "cw",
  });
  const bottomText = arcText("BY SIGNEDBY.AI", {
    cx: CX,
    cy: CY,
    radius: 103,
    midAngleDeg: 90,
    stepDeg: 11,
    fontSize: 14,
    color: "#475569",
    direction: "ccw",
  });

  const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${CX}" cy="${CY}" r="152" fill="#cbd5e1" />
  ${notches}
  <circle cx="${CX}" cy="${CY}" r="134" fill="#f8fafc" />
  <circle cx="${CX}" cy="${CY}" r="134" fill="none" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="${CX}" cy="${CY}" r="118" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2 5" />

  ${topText}
  ${bottomText}

  <image href="${qrDataUrl}" x="${CX - 65}" y="${CY - 65}" width="130" height="130" />

  <circle cx="${CX + 90}" cy="${CY - 90}" r="8" fill="#cbd5e1" />

  <circle cx="270" cy="60" r="32" fill="#ffffff" />
  <circle cx="270" cy="60" r="26" fill="#16a34a" />
  <path d="M 257 61 L 266 70 L 284 48" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

  const buf = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
  const outPath = path.join(process.cwd(), "public", "verified-seal-badge.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
