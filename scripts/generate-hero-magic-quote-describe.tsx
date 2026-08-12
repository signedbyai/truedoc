import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// New hero asset, 2026-08-12 direct ask: "add an animation on Magic Quote
// to the quote output (just the top half so you can see it as quote)."
// The existing hero-magic-quote.png only shows the REVIEW step (the
// itemized editor with line items/totals, cropped to its top half by the
// inner-crossfade component for this specific state). This is the other
// real half of the story -- the DESCRIBE step that comes before it
// (magic-quote-form.tsx, step === "describe") -- so the Quote hero slot
// can crossfade input -> output the same way Seal now crossfades
// sealed-invoice -> verify-result.
//
// Every string below is real, reused verbatim from src/lib/quote-labels.ts
// (ql("describeJob"), ql("reviewDisclaimer"), ql("generateQuote")) and
// magic-quote-form.tsx's own JSX structure -- not invented copy. No live
// authenticated session was reachable from this sandbox to capture this
// step directly (same constraint noted in generate-hero-new-document-
// draft.tsx), so this recreates it faithfully instead, matching that
// script's established approach. The typed example text ("iPhone screen
// repair...") is chosen to lead naturally into the $100 line item already
// shown in the real hero-magic-quote.png review screenshot, so the two
// crossfade states read as one continuous demo rather than two
// unrelated examples.
//
// Borderless (no card outline), matching hero-magic-quote.png's own
// style -- unlike the Draft hero images, Quote's real screenshots have
// never had a visible card border in this crop.

const WIDTH = 568;
const HEIGHT = 420;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const YELLOW = "#fde047";

const DESCRIBE_TEXT = "iPhone screen repair for Alice, $80 for the part, 1 hour labor at $70/hr";

// Small rounded-square "$" icon -- same visual language as
// scripts/fix-hero-magic-quote-button.py's draw_receipt_icon (the real
// button's actual look on hero-magic-quote.png), reproduced here as
// plain divs/text since this is next/og, not PIL.
function DollarIcon({ size, color }: { size: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderRadius: size * 0.2,
        fontSize: size * 0.62,
        fontWeight: 700,
        color,
      }}
    >
      $
    </div>
  );
}

function main() {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: "28px 24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 19, fontWeight: 700, color: NAVY }}>
            Generate your Magic Quote
          </div>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              fontSize: 13,
              color: SLATE,
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: 460,
            }}
          >
            Describe the job in plain language and get a line-item price quote to review and edit.
          </div>
        </div>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 600, color: SLATE }}>Quote language</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 40,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "0 14px",
                fontSize: 14,
                color: NAVY,
              }}
            >
              English
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 600, color: SLATE }}>Describe the job</div>
            <div
              style={{
                display: "flex",
                border: `2px solid ${NAVY}`,
                borderRadius: 8,
                padding: 13,
                fontSize: 14,
                color: NAVY,
                lineHeight: 1.5,
                minHeight: 82,
              }}
            >
              {DESCRIBE_TEXT}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 11.5, color: MUTED, lineHeight: 1.5 }}>
            Review the line items and totals before sending — you&apos;re responsible for the final quote.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: YELLOW,
              color: NAVY,
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 10,
              padding: "13px 0",
            }}
          >
            <DollarIcon size={16} color={NAVY} />
            Generate quote
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function run() {
  const res = main();
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-magic-quote-describe.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
