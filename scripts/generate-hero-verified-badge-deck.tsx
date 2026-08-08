import fs from "node:fs/promises";
import path from "node:path";
import { generateVerifiedBadgeImage } from "../src/lib/badge-asset";

// Deck-only variant of the real Verified Badge asset (direct report,
// 2026-08-08: "The QR codes in the slides ... give me 404's or errors").
// public/hero-verified-badge.png -- which the Verification slide was
// using -- is ALSO the live marketing hero on the real /verified-badge
// page (src/app/verified-badge/page.tsx) and its OG card, generated via
// this exact function but with a fake placeholder hash
// (?hash=aaaa...aaa, 128 a's), which the real /verify page correctly
// reports as "No match found". That's a real bug on the live site too,
// not just the deck -- flagged separately, NOT fixed here, since
// swapping what's live on the marketing page is a bigger call than "fix
// the deck's QR codes" and shouldn't happen without being asked.
//
// This script calls the SAME real generateVerifiedBadgeImage() function
// (not a recreation) with a working URL instead, so the deck's badge is
// still a byte-for-byte real product asset -- just pointed at
// signedby.ai/verified-badge (a real, live page; direct instruction:
// home page or a CTA page is a fine destination) instead of a fake hash.
async function run() {
  const png = await generateVerifiedBadgeImage("https://signedby.ai/verified-badge", true);
  const outPath = path.join(process.cwd(), "public", "hero-verified-badge-deck.png");
  await fs.writeFile(outPath, png);
  console.log("wrote", outPath, png.length, "bytes");
}

run();
