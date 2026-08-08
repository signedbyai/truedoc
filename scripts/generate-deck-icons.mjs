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
  "QrCode", "Clock", "ListChecks",       // Sign slide
  "Stamp", "ScanLine", "ShieldAlert",    // Seal slide
  "WandSparkles", "FileText", "PenLine", // Draft slide
];

const outDir = path.join(process.cwd(), "public", "deck-icons");

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of icons) {
    const Icon = Lucide[name];
    if (!Icon) { console.error("MISSING", name); continue; }
    const el = React.createElement(Icon, {
      color: NAVY,
      strokeWidth: 2,
      size: 512,
      absoluteStrokeWidth: true,
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
}
run();
