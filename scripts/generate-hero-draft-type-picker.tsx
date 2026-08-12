import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// New hero asset, 2026-08-12 direct ask: for the Draft hero image,
// "animate to the list of templates to pick from" — the current
// hero-new-document-draft.png only ever shows the Document type field
// COLLAPSED (real screenshot, "Freelance / Services Agreement" selected).
// There's no live authenticated session reachable from this sandbox to
// capture the real dropdown actually open (and a native <select>'s open
// state isn't something a browser screenshot tool can capture anyway —
// it renders outside normal page layout), so this recreates it the same
// way generate-hero-new-document-draft.tsx's own superseded version did:
// every option label below is copied verbatim from
// src/lib/ai-draft-types.ts's real DOCUMENT_TYPES (id/en label pairs),
// not invented, and the field/card styling matches that same file's
// SelectField/layout constants so the two images read as one continuous
// UI rather than two different mockup styles.
//
// Six of the eleven real document types are shown (not all eleven) --
// enough to read as "a real list", not a token one, without the dropdown
// panel dominating the whole card. Freelance / Services Agreement is
// shown selected/highlighted (matches the collapsed state in the other
// image, so the two states the inner crossfade alternates between are
// visibly "the same field, open vs. closed", not two unrelated screens.

const WIDTH = 860;
const HEIGHT = 600;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";

// Verbatim from ai-draft-types.ts's DOCUMENT_TYPES (id, en label) —
// see that file for the full list of eleven; these six give a real,
// representative spread (freelancer work, legal/compliance, rentals,
// corporate governance) rather than picking six similar ones.
const VISIBLE_TYPES: { id: string; label: string }[] = [
  { id: "freelance", label: "Freelance / Services Agreement" },
  { id: "nda", label: "Non-Disclosure Agreement (NDA)" },
  { id: "waiver", label: "Waiver / Release of Liability" },
  { id: "board_resolution", label: "Board Resolution / Written Consent" },
  { id: "shareholder_consent", label: "Shareholder Consent / Written Consent" },
  { id: "general", label: "General Agreement" },
];
const SELECTED_ID = "freelance";

// Border-triangle chevrons (borderTop/Left/Right trick) render as a solid
// filled rectangle in this project's next/og setup, not an actual
// triangle -- confirmed by rendering and pixel-inspecting this script's
// first draft. Two rotated bars meeting at a point is the same
// proven-safe technique generate-hero-new-document-draft.tsx's Spark
// icon already uses successfully (plain divs + `transform: rotate()`,
// no border tricks, no external glyphs).
function ChevronUp({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", width: 10, height: 7, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 3,
          width: 7,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
          transform: "rotate(35deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 3,
          width: 7,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
          transform: "rotate(-35deg)",
        }}
      />
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
          padding: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            boxShadow: "0 12px 30px -14px rgba(15, 23, 42, 0.18)",
            padding: "32px 32px 28px",
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

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>Document type</div>
            {/* The field itself, drawn "open" -- border continues straight
                into the option panel below it (no gap/radius on the shared
                edge), same visual grammar most open native/custom selects
                use to read as one continuous control. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 44,
                border: `1px solid #cbd5e1`,
                borderBottom: "none",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                padding: "0 14px",
                fontSize: 15,
                color: NAVY,
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex" }}>Freelance / Services Agreement</div>
              {/* Chevron flipped up (vs. the collapsed field's down
                  chevron) -- the one small real affordance change an open
                  select actually shows. */}
              <ChevronUp color={MUTED} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: `1px solid #cbd5e1`,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                backgroundColor: "#ffffff",
                boxShadow: "0 16px 32px -12px rgba(15, 23, 42, 0.22)",
                overflow: "hidden",
              }}
            >
              {VISIBLE_TYPES.map((t, i) => {
                const selected = t.id === SELECTED_ID;
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: 42,
                      padding: "0 14px",
                      fontSize: 14.5,
                      fontWeight: selected ? 700 : 400,
                      color: selected ? NAVY : SLATE,
                      backgroundColor: selected ? "#fef9c3" : "#ffffff",
                      borderTop: i === 0 ? "none" : `1px solid #f1f5f9`,
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* A dimmed peek of the next field, cut off by the card's own
              bottom padding -- signals "there's more form below the open
              dropdown" without fully rendering (and redundantly
              screenshotting) the language/description fields already
              shown in full in the other Draft image. */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, opacity: 0.35 }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>Document language</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 44,
                border: `1px solid #cbd5e1`,
                borderRadius: 8,
                padding: "0 14px",
                fontSize: 15,
                color: NAVY,
                backgroundColor: "#ffffff",
              }}
            >
              English
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
  const outPath = path.join(process.cwd(), "public", "hero-draft-type-list.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
