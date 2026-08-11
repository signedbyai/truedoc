import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Draft card's redesigned hero (2026-08-12, direct ask: "the hero image
// needs to be redone... We can just shoot part of the New document screen
// for Draft perhaps to keep it simple"). Replaces hero-ai-draft-mockup.png
// (public/hero-ai-draft-mockup.png, generate-hero-ai-draft.tsx), which its
// own comment admitted was a stylized two-panel mockup that doesn't match
// the real screen -- the real AI Drafter is a single-column sequential
// generate-then-review flow (ai-draft-form.tsx), not a side-by-side
// input/output layout.
//
// This is a faithful recreation of the real /dashboard/documents/new page
// with the Draft tab active (new-document-client.tsx + ai-draft-form.tsx's
// "describe" step), not a captured screenshot -- no authenticated session
// was available to capture a real one from this sandbox, but every string
// and layout element below is real, reused verbatim from those two
// components rather than invented: "New document" h1, the 4-tab
// Sign/Seal/Quote/Draft picker (same order/icons as the live tab row), the
// centered yellow icon badge + "Generate your document draft" + its exact
// subtitle, the Document type / Document language selects, the "Describe
// what you need" field (filled with the real Freelance placeholder text),
// the real AI_DRAFT_DISCLAIMER and AI_DRAFT_CHECKBOX_LABEL copy
// (ai-draft-types.ts), and the "Generate draft" button.

const WIDTH = 860;
const HEIGHT = 900;
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

function TabButton({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        border: `1px solid ${active ? NAVY : BORDER}`,
        backgroundColor: active ? NAVY : "#ffffff",
        color: active ? "#ffffff" : SLATE,
        fontSize: 15,
        fontWeight: 600,
        padding: "10px 0",
      }}
    >
      {active && <Spark size={14} color="#ffffff" />}
      {label}
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
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: "44px 44px",
        }}
      >
        <div style={{ display: "flex", fontSize: 27, fontWeight: 700, color: NAVY }}>New document</div>

        {/* 4-tab picker, same order/icons as new-document-client.tsx's real
            grid: Sign, Seal, Quote, Draft (active). */}
        <div style={{ marginTop: 22, display: "flex", flexDirection: "row", gap: 8 }}>
          <TabButton label="Sign" active={false} />
          <TabButton label="Seal" active={false} />
          <TabButton label="Quote" active={false} />
          <TabButton label="Draft" active={true} />
        </div>

        {/* Card, matching the real Draft tab's CardHeader: centered yellow
            icon badge + title + description. */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            boxShadow: "0 12px 30px -14px rgba(15, 23, 42, 0.18)",
            padding: "32px 32px 40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: YELLOW,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spark size={24} color={NAVY} />
            </div>
            <div style={{ marginTop: 10, display: "flex", fontSize: 20, fontWeight: 700, color: NAVY }}>
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

          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
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
