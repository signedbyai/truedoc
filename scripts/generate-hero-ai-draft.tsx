import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Hero mockup for the pitch deck's "Draft" (template drafter/editor) slide.
// Deliberately sized 1562x1070 to match hero-field-editor.png's exact
// aspect ratio, since that's the image slide 5 (PRODUCT) already sizes its
// white device-frame card around -- reusing the same card geometry math
// for the new slide instead of re-deriving a new fit-to-aspect-ratio
// calculation. This is a stylized mockup (abstracted, not a real product
// screenshot) since the real AI-draft screen isn't a two-panel input/output
// layout -- it's a sequential generate-then-review flow (see
// ai-draft-form.tsx). Labelled honestly as illustrative in the deck slide
// itself, same pattern as every other non-real-screenshot mockup in this
// deck.
//
// Real copy reused verbatim (ai-draft-form.tsx / ai-draft-types.ts):
// - Label "Describe what you need"
// - Freelance placeholder: "e.g. 3-month logo design project, $2,000
//   total, net-30, client owns final files"
// - Button "Generate draft"
// - Doc type "Freelance / Services Agreement"

const WIDTH = 1562;
const HEIGHT = 1070;

const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";

function main() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Left: the describe-it form, filled in */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 720,
            padding: "56px 48px",
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>
            New document · AI Draft
          </div>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: SLATE }}>Document type</div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                border: `2px solid ${BORDER}`,
                borderRadius: 12,
                padding: "14px 18px",
                fontSize: 22,
                fontWeight: 600,
                color: NAVY,
              }}
            >
              Freelance / Services Agreement
            </div>
          </div>
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: SLATE }}>Describe what you need</div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flex: 1,
                border: `2px solid ${NAVY}`,
                borderRadius: 12,
                padding: "18px 20px",
                fontSize: 23,
                lineHeight: 1.5,
                color: NAVY,
                fontWeight: 500,
              }}
            >
              3-month logo design project, $2,000 total, net-30, client owns final files
            </div>
          </div>
          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: NAVY,
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 12,
              padding: "16px 0",
              alignSelf: "stretch",
            }}
          >
            Generate draft
          </div>
        </div>

        {/* Right: the generated output, ready to edit */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 48px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "#ecfdf5",
              color: "#047857",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRadius: 999,
              padding: "7px 16px",
            }}
          >
            AI-DRAFTED · REVIEW BEFORE SENDING
          </div>
          <div style={{ marginTop: 22, display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>
            Freelance / Services Agreement
          </div>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              ["1. Scope of work", "Design and delivery of a final logo, running for 3 months from the effective date."],
              ["2. Payment terms", "Total fee of $2,000, invoiced on completion, due net-30."],
              ["3. Ownership", "Client owns all final delivered files upon full payment."],
            ].map(([title, body]) => (
              <div key={title} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: NAVY }}>{title}</div>
                <div style={{ marginTop: 4, display: "flex", fontSize: 18, color: SLATE, lineHeight: 1.4 }}>{body}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: `2px solid ${BORDER}`,
                color: SLATE,
                fontSize: 18,
                fontWeight: 600,
                borderRadius: 10,
                padding: "12px 22px",
              }}
            >
              Regenerate
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: NAVY,
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 700,
                borderRadius: 10,
                padding: "12px 22px",
              }}
            >
              Continue to editor
            </div>
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
  const outPath = path.join(process.cwd(), "public", "hero-ai-draft-mockup.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
