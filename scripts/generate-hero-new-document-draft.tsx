import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// SUPERSEDED 2026-08-12, third pass -- public/hero-new-document-draft.png is
// no longer this script's output. Michael supplied a real screenshot of the
// live /dashboard/documents/new Draft tab directly (matches this script's
// own second-pass version closely: centered yellow spark badge, heading,
// subtitle, Document type/language selects, description field, disclaimer,
// checkbox, Generate draft button -- confirming that version's layout was
// accurate) -- the real capture replaced the synthetic render outright
// rather than being edited. Left in place for history/re-reference (same
// "keep it, don't delete" convention as the *.orphaned-do-not-track files
// elsewhere in this repo) -- do NOT re-run this expecting it to regenerate
// the current public/hero-new-document-draft.png; it would overwrite the
// real screenshot with the synthetic one again.
//
// Draft card's redesigned hero (2026-08-12, direct ask: "the hero image
// needs to be redone... We can just shoot part of the New document screen
// for Draft perhaps to keep it simple"). Replaces hero-ai-draft-mockup.png
// (public/hero-ai-draft-mockup.png, generate-hero-ai-draft.tsx), which its
// own comment admitted was a stylized two-panel mockup that doesn't match
// the real screen -- the real AI Drafter is a single-column sequential
// generate-then-review flow (ai-draft-form.tsx), not a side-by-side
// input/output layout.
//
// Every string and layout element below is real, reused verbatim from
// new-document-client.tsx / ai-draft-form.tsx / ai-draft-types.ts rather
// than invented -- not a captured screenshot (no authenticated session was
// reachable from this sandbox), but no invented copy or layout either.
//
// 2026-08-12, second pass, direct follow-up: "trim crop out the top form
// headers and menu and redundant badge. Maybe there is something from the
// next screen to mash it up with." Two changes from the first version:
// (1) dropped the "New document" h1, the 4-tab picker, and the yellow
// spark icon badge above the heading -- all real, but redundant once this
// card sits inside the homepage's own "Sign/Seal/Quote/Draft" reasons row,
// which already has its own icon+label for this exact card. (2) mashed up
// with ai-draft-form.tsx's OWN "review" step (the screen this form
// advances to after "Generate draft") -- Document title + a trimmed
// preview of the generated draft body + "Create document ->", using the
// review step's real (non-cta, plain dark) button styling since nothing
// here asked to change it, unlike Quote's button recolor. This gives the
// image an actual before/after instead of stopping at the input form,
// answering the "something from the next screen" question with real
// content instead of a fallback crop.

const WIDTH = 860;
const HEIGHT = 1075;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const YELLOW = "#fde047";
const AMBER_BORDER = "#fde68a";
const AMBER_BG = "#fffbeb";
const AMBER_TEXT = "#78350f";

const DISCLAIMER =
  "This drafts a starting document based on what you describe — it is not legal advice, and SignedBy is not a " +
  "law firm or a substitute for one. Read the draft carefully before sending it.";

const CHECKBOX_LABEL =
  "I understand this is an AI-generated starting draft, not legal advice, and I'm responsible for reviewing it before sending.";

// Plausible generated output for the "3-month logo design project..."
// description above -- same demo-content spirit as the field editor's
// "Demo_Consulting_Agreement" and the invoice card's "A. Marlowe Design",
// not a claim that the AI produces this exact text deterministically.
const DRAFT_TITLE = "Logo Design Services Agreement";
const DRAFT_SECTIONS: [string, string][] = [
  ["1. Scope of work", "Design and delivery of a final logo, running for 3 months from the effective date."],
  ["2. Payment terms", "Total fee of $2,000, invoiced on completion, due net-30."],
  ["3. Ownership", "Client owns all final delivered files upon full payment."],
];

// No emoji/pictographic glyphs anywhere in this file (2026-08-12, learned the
// hard way) -- next/og's font detector tries to fetch a matching fallback
// font from fonts.googleapis.com/cdn.jsdelivr.net for any character outside
// its built-in Latin set, and the sandbox has no route to either host, so
// the render throws EAI_AGAIN instead of producing a PNG. Every icon below
// is a plain CSS shape instead (diamond spark, triangle chevron) — same
// constraint the existing generate-hero-*.tsx scripts already worked around
// by compositing real PNG assets (the seal, the QR code) rather than typing
// a checkmark or shield character.
function Spark({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ display: "flex", width: size, height: size, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: size * 0.28,
          top: size * 0.28,
          width: size * 0.44,
          height: size * 0.44,
          backgroundColor: color,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: size * 0.08,
          top: size * 0.08,
          width: size * 0.2,
          height: size * 0.2,
          backgroundColor: color,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 44,
          border: `1px solid #cbd5e1`,
          borderRadius: 8,
          padding: "0 14px",
          fontSize: 15,
          color: NAVY,
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex" }}>{value}</div>
        <div
          style={{
            display: "flex",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: `6px solid ${MUTED}`,
          }}
        />
      </div>
    </div>
  );
}

function main() {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 44,
        }}
      >
        {/* Card -- no outer h1/tab-row/badge (cropped, 2026-08-12). Starts
            straight at the heading. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            boxShadow: "0 12px 30px -14px rgba(15, 23, 42, 0.18)",
            padding: "32px 32px 36px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: NAVY }}>
              Generate your document draft
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                fontSize: 14,
                color: SLATE,
                textAlign: "center",
                lineHeight: 1.4,
                maxWidth: 480,
              }}
            >
              Describe what you need in plain language and get a starting draft to review and edit.
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <SelectField label="Document type" value="Freelance / Services Agreement" />
            <SelectField label="Document language" value="English" />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>
                Describe what you need
              </div>
              <div
                style={{
                  display: "flex",
                  border: `2px solid ${NAVY}`,
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 15,
                  color: NAVY,
                  lineHeight: 1.5,
                }}
              >
                3-month logo design project, $2,000 total, net-30, client owns final files
              </div>
            </div>

            <div
              style={{
                display: "flex",
                border: `1px solid ${AMBER_BORDER}`,
                backgroundColor: AMBER_BG,
                color: AMBER_TEXT,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {DISCLAIMER}
            </div>

            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  width: 14,
                  height: 14,
                  marginTop: 2,
                  borderRadius: 3,
                  border: `1.5px solid ${NAVY}`,
                  backgroundColor: NAVY,
                }}
              />
              <div style={{ display: "flex", fontSize: 12, color: SLATE, lineHeight: 1.5 }}>{CHECKBOX_LABEL}</div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: YELLOW,
                color: NAVY,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                padding: "14px 0",
              }}
            >
              <Spark size={16} color={NAVY} />
              Generate draft
            </div>
          </div>

          {/* Mashup with ai-draft-form.tsx's own "review" step -- the real
              next screen this form advances to. Trimmed: the real step
              shows an 18-row editable textarea for the full draft body;
              this shows the first 3 sections only, same illustrative-not-
              exhaustive treatment the rest of this card already uses. */}
          <div style={{ marginTop: 28, display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flex: 1, height: 1, backgroundColor: BORDER }} />
            <div style={{ display: "flex", fontSize: 12, fontWeight: 600, color: MUTED, letterSpacing: 0.4 }}>
              GENERATES A READY-TO-EDIT DRAFT
            </div>
            <div style={{ display: "flex", flex: 1, height: 1, backgroundColor: BORDER }} />
          </div>

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>Document title</div>
              <div
                style={{
                  display: "flex",
                  height: 44,
                  alignItems: "center",
                  border: `1px solid #cbd5e1`,
                  borderRadius: 8,
                  padding: "0 14px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: NAVY,
                  backgroundColor: "#ffffff",
                }}
              >
                {DRAFT_TITLE}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>
                Draft text — review and edit before creating the document
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: "#fafafa",
                }}
              >
                {DRAFT_SECTIONS.map(([title, body]) => (
                  <div key={title} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: NAVY }}>{title}</div>
                    <div style={{ marginTop: 2, display: "flex", fontSize: 12.5, color: SLATE, lineHeight: 1.5 }}>
                      {body}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real (non-cta) dark Button styling -- ai-draft-form.tsx's
                review step deliberately does NOT use the yellow cta variant
                for this button, unlike "Generate draft" above it. Kept as
                real, not changed to yellow like Quote's button was -- no
                instruction to deviate from the live product here. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: NAVY,
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                padding: "14px 0",
              }}
            >
              Create document →
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
  const outPath = path.join(process.cwd(), "public", "hero-new-document-draft.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
