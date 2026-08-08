// Generates the lucide-icon PNGs used as the small circle-badge icons on
// the pitch deck's SIGN/SEAL/DRAFT feature slides (see
// build-deck-slides-v7.py), matching the style of the icons already
// embedded in the deck's PRODUCT slide (sparkles/smartphone/shield-check --
// navy line icons on a white circle). Written to public/deck-icons/ so
// they persist in the repo and the deck-build script can find them again
// if the deck is rebuilt later.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const NAVY = "#0F172A";
const icons = [
  "QrCode", "Clock", "ListChecks",       // (superseded) Sign slide callouts
  "Stamp", "ScanLine", "ShieldAlert",    // (superseded) Seal slide callouts
  "WandSparkles", "FileText", "PenLine", // Draft slide callouts
];

// Exact same 4 icons + same navy-on-yellow-square styling as the real
// app's New Document tab badges (new-document-client.tsx: Signature/
// ShieldCheck/Receipt/Sparkles, each in a `bg-yellow-300 rounded-2xl`
// h-14 w-14 badge with an h-6 w-6 text-slate-900 icon) -- used for the
// deck's 4-up SIGN/SEAL/QUOTE/DRAFT use-case summary slide so the deck
// literally reuses the product's own iconography rather than inventing
// new marks. slate-900 and #0F172A (NAVY above) render close enough to
// be visually identical at deck scale.
const badgeIcons = ["Signature", "ShieldCheck", "Receipt", "Sparkles"];

const outDir = path.join(process.cwd(), "public", "deck-icons");

async function renderIcon(name, color) {
  const Icon = Lucide[name];
  if (!Icon) { console.error("MISSING", name); return; }
  // No absoluteStrokeWidth here (on purpose, fixed 2026-08-08): that prop
  // locks the stroke to a literal "2" regardless of render size, which at
  // size:512 produced a hairline that read as almost-invisible pale-yellow
  // once alpha-blended onto the summary slide's yellow badges (fine on the
  // deck's other icons, which sit on white). Leaving it unset lets the
  // stroke scale with the icon the same way the browser renders lucide
  // icons normally, matching the real app badges' visual weight.
  const el = React.createElement(Icon, {
    color,
    strokeWidth: 2,
    size: 512,
  });
  const svg = renderToStaticMarkup(el);
  const svgFull = svg.includes("xmlns=")
    ? svg
    : svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svgFull);
  await sharp(Buffer.from(svgFull), { density: 300 })
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, `${name}.png`));
  console.log("done", name);
}

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of icons) await renderIcon(name, NAVY);
  for (const name of badgeIcons) await renderIcon(name, NAVY);
}
run();
