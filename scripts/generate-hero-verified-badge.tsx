import fs from "node:fs/promises";
import path from "node:path";
import { generateVerifiedBadgeImage } from "../src/lib/badge-asset";

// Regenerates the REAL production hero image for /verified-badge (also
// reused byte-for-byte as that page's opengraph-image.tsx share card --
// see src/app/verified-badge/opengraph-image.tsx's loadBadgeDataUri()).
//
// Direct report, 2026-08-08: "The QR codes in the slides with QR codes
// give me 404's or errors" (about the pitch deck) surfaced that this file
// -- separately, on the live site -- encodes a fake placeholder hash
// (?hash=aaaa...aaa, 128 a's), which the real /verify page correctly
// reports as "No match found". Follow-up direct ask: "yes if you can
// please fix the QR code on the /verified-badge marketing page".
//
// This exact bug has been fixed once before and regressed once since:
//   - 267876a (2026-08-02): pointed the QR at console.signedby.ai instead
//     of a fake /verify?hash= lookup, direct ask, same reasoning as today.
//   - f03ef95 (2026-08-03): regenerated this file to pick up the new RFC
//     3161 trusted-timestamp footer copy (hasTrustedTimestamp param added
//     to generateVerifiedBadgeImage) and silently reverted to a fake hash
//     in the process -- whatever one-off script did that regeneration was
//     never committed, so there's no record of why.
//
// This script is committed (unlike whatever produced the f03ef95 version)
// specifically so this doesn't regress a third time -- rerunning it is
// now the documented way to regenerate this asset after any future
// generateVerifiedBadgeImage() layout change.
async function run() {
  const png = await generateVerifiedBadgeImage("https://console.signedby.ai", true);
  const outPath = path.join(process.cwd(), "public", "hero-verified-badge.png");
  await fs.writeFile(outPath, png);
  console.log("wrote", outPath, png.length, "bytes");
}

run();
