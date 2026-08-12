import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Animated header mark for the paid-subscriber welcome email
// (WELCOME_EMAIL_SCOPE.md) — stands in for Lemonade's team-clapping photo,
// which SignedBy has no equivalent asset for. Every frame is a complete,
// on-brand composition (badge + wordmark, nothing missing or half-drawn) —
// deliberately NOT a build-up/reveal animation, because Outlook desktop
// only ever renders an animated GIF's first frame. Instead the badge does a
// gentle "breathing" glow pulse, the same motif already used elsewhere in
// the product for "something alive/intelligent lives here" (see
// globals.css's .ai-comet comment) — reused here for brand continuity, not
// copied blind. Frame 0 and the last frame are identical so the loop has no
// visible seam.

const WIDTH = 640;
const HEIGHT = 220;
const NAVY = "#0f172a";
const SLATE = "#64748b";
const YELLOW = "#fde047";

type Frame = { badge: number; blur: number; spread: number; alpha: number };

// badge size + glow strength at each step — rest -> peak -> rest, so frame 0
// and frame 4 render pixel-identical (the safe "first frame" for clients
// that don't animate, and a clean loop point for clients that do).
const FRAMES: Frame[] = [
  { badge: 76, blur: 0, spread: 0, alpha: 0.0 },
  { badge: 79, blur: 14, spread: 2, alpha: 0.35 },
  { badge: 82, blur: 26, spread: 4, alpha: 0.5 },
  { badge: 79, blur: 14, spread: 2, alpha: 0.35 },
  { badge: 76, blur: 0, spread: 0, alpha: 0.0 },
];

function renderFrame(f: Frame) {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: f.badge,
              height: f.badge,
              borderRadius: 22,
              backgroundColor: YELLOW,
              boxShadow: f.alpha > 0 ? `0 0 ${f.blur}px ${f.spread}px rgba(253,224,71,${f.alpha})` : "none",
            }}
          >
            {/* the slash mark from the logo lockup — a rotated bar, same
                construction proven in generate-hero-new-document-draft.tsx */}
            <div
              style={{
                display: "flex",
                width: 11,
                height: 38,
                borderRadius: 4,
                backgroundColor: NAVY,
                transform: "rotate(-18deg)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: NAVY }}>SignedBy</div>
            <div style={{ display: "flex", marginTop: 2, fontSize: 18, color: SLATE }}>Welcome aboard</div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function run() {
  const outDir = path.join(process.cwd(), "public", "_welcome-frames");
  await fs.mkdir(outDir, { recursive: true });

  for (let i = 0; i < FRAMES.length; i++) {
    const res = renderFrame(FRAMES[i]);
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(outDir, `frame-${i}.png`);
    await fs.writeFile(outPath, buf);
    console.log("wrote", outPath, buf.length, "bytes");
  }
}

run();
