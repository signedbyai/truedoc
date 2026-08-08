import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Pitch-deck asset for the new "Verification" slide (direct ask,
// 2026-08-08): a browser-chrome-framed mockup of src/app/verify/page.tsx's
// real "isVerifiedBadge" result state -- same copy, same emerald-50/
// emerald-200 styling, same dl rows (File/Sealed/Identity verified/
// Trusted timestamp/Organization) as that component's actual JSX. This is
// a stylized recreation (illustrative browser chrome, fabricated example
// values), not a real screenshot -- caption it that way, same convention
// as the deck's other non-screenshot mockups.

const WIDTH = 900;
const HEIGHT = 840;

const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const EMERALD_BORDER = "#a7f3d0";
const EMERALD_BG = "#ecfdf5";
const EMERALD_TEXT = "#065f46";
const EMERALD_LABEL = "#047857";

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", fontSize: 15, color: EMERALD_LABEL }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: EMERALD_TEXT }}>{value}</div>
        {sub && <div style={{ display: "flex", fontSize: 12, color: EMERALD_LABEL, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

async function loadDataUri(filename: string): Promise<string> {
  const buf = await fs.readFile(path.join(process.cwd(), "public", "deck-icons", filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function main() {
  const checkDataUri = await loadDataUri("Check-emerald.png");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* Browser chrome -- same 3-dot convention as the deck's DEVELOPERS
            slide code panel. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#f1f5f9",
            padding: "18px 24px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: "#f87171" }} />
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: "#fbbf24" }} />
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: "#34d399" }} />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              flex: 1,
              alignItems: "center",
              backgroundColor: "#ffffff",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 15,
              color: SLATE,
            }}
          >
            signedby.ai/verify?hash=8f2e91…
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 48px" }}>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: MUTED }}>← SignedBy</div>
          <div style={{ marginTop: 20, display: "flex", fontSize: 30, fontWeight: 700, color: NAVY }}>
            Verify a document
          </div>
          <div style={{ marginTop: 10, display: "flex", fontSize: 15, color: SLATE, lineHeight: 1.5 }}>
            Every document signed with SignedBy gets a checksum. Paste it below to independently confirm it&apos;s
            genuine — no account needed.
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 12, fontWeight: 600, color: SLATE }}>DOCUMENT CHECKSUM</div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: MUTED,
                fontFamily: "monospace",
              }}
            >
              8f2e91a4c7…d3b0
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: NAVY,
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                padding: "12px 0",
              }}
            >
              Verify
            </div>
          </div>

          {/* The real result panel -- exact copy from verify/page.tsx's
              isVerifiedBadge branch. */}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              borderRadius: 12,
              border: `1px solid ${EMERALD_BORDER}`,
              backgroundColor: EMERALD_BG,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
              <img src={checkDataUri} width={18} height={18} alt="" />
              <div style={{ display: "flex", fontSize: 17, fontWeight: 700, color: "#065f46" }}>
                Sealed and identity-verified
              </div>
            </div>
            <div style={{ marginTop: 4, display: "flex", fontSize: 20, fontWeight: 700, color: "#064e3b" }}>
              Amara Okafor
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="File" value="Demo_Consulting_Agreement.pdf" />
              <Row label="Sealed" value="Aug 6, 2026, 3:42 PM" />
              <Row label="Identity verified" value="Aug 6, 2026" />
              <Row label="Trusted timestamp" value="Sectigo (RFC 3161)" sub="Aug 6, 2026, 3:42 PM" />
              <Row label="Organization" value="Amara Okafor Design" />
            </div>
            <div style={{ marginTop: 16, display: "flex", fontSize: 12.5, color: EMERALD_LABEL, lineHeight: 1.5 }}>
              This confirms the file existed, unaltered, as of a cryptographically verified timestamp, sealed by a
              verified individual. It doesn&apos;t certify the file&apos;s contents weren&apos;t AI-generated — only
              that it hasn&apos;t changed since this timestamp.
            </div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function run() {
  const res = await main();
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-verify-result.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
