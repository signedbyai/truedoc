// One-off generator for the ten inline step mockups on
// /boat-jet-ski-rental/guide, run via:
//   npx tsx scripts/generate-guide-screenshots-boat-jet-ski-rental.tsx
//
// Same next/og ImageResponse approach as every other one-off generator in
// this app (see generate-hero-boat-jet-ski-rental.tsx) -- no browser/
// Chromium/root install needed, which the sandbox doesn't have.
//
// Direct ask 2026-08-08: add a screenshot example to each step of the
// guide. Asked the user whether these should be real live-app screenshots
// (via Chrome, against dev.signedby.ai) or stylized on-brand mockups
// matching the existing hero/ad-creative style -- they chose the latter,
// so these are illustrative mockups, not literal product screenshots.
// Icons are abstracted to plain shapes (dots/squares) rather than the
// real lucide icons, matching the same simplification the hero image
// already uses for its "signature field" pill.
//
// All ten share one browser-chrome frame() so the guide reads as one
// consistent set. 1200x750 across the board -- smaller and squarer than
// the 1562x1070 page hero, since these sit inline next to step text
// rather than as a standalone hero.
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 750;
const YELLOW = "#eab308";
const YELLOW_BG = "#fefce8";
const YELLOW_BORDER = "#fde047";

function frame(label: string, content: React.ReactNode) {
  return (
    <div style={{ width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc", padding: 28 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px -18px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 24px", backgroundColor: "#eef2f7", borderBottom: "1px solid #e2e8f0" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#cbd5e1", display: "flex" }} />
          ))}
          <span style={{ marginLeft: 10, fontSize: 17, color: "#64748b" }}>{label}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "32px 36px" }}>{content}</div>
      </div>
    </div>
  );
}

const STEPS: { slug: string; label: string; content: React.ReactNode }[] = [
  {
    slug: "upload-form",
    label: "New Document · Sign tab",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Upload your rental agreement</span>
        <div
          style={{
            marginTop: 28,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #cbd5e1",
            borderRadius: 14,
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#e2e8f0", display: "flex" }} />
          <span style={{ marginTop: 20, fontSize: 20, color: "#64748b" }}>Drop a PDF here, or click to upload</span>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "10px 18px",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: YELLOW, display: "flex" }} />
            <span style={{ fontSize: 18, color: "#334155" }}>boat-rental-agreement.pdf</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "detected-signers",
    label: "New Document · Detected signers",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>We detected 2 signers</span>
        <span style={{ marginTop: 8, fontSize: 18, color: "#64748b" }}>Confirm and add an email for each party.</span>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["Owner", "you@marinadelsol.com"],
            ["Renter", "renter@email.com"],
          ].map(([role, email]) => (
            <div key={role} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" }}>
              <span style={{ fontSize: 16, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 14px", borderRadius: 999, display: "flex" }}>{role}</span>
              <span style={{ fontSize: 18, color: "#94a3b8" }}>{email}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <span style={{ alignSelf: "flex-start", display: "flex", fontSize: 18, fontWeight: 600, color: "#111827", backgroundColor: YELLOW, padding: "12px 24px", borderRadius: 10 }}>
          Confirm &amp; continue
        </span>
      </div>
    ),
  },
  {
    slug: "review-fields",
    label: "New Document · Field editor",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Review the suggested fields</span>
        <div style={{ marginTop: 20, position: "relative", flex: 1, display: "flex", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <div
            style={{
              position: "absolute",
              top: 36,
              left: 320,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <span style={{ fontSize: 15, color: "#854d0e" }}>Signature</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 116,
              left: 90,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <span style={{ fontSize: 15, color: "#854d0e" }}>Date</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 196,
              left: 470,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <span style={{ fontSize: 15, color: "#854d0e" }}>Initials</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "fixed-vs-rental",
    label: "New Document · Field editor",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Fixed vs. per-rental fields</span>
        <div style={{ marginTop: 24, display: "flex", gap: 20, flex: 1 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <span style={{ fontSize: 16, color: "#64748b" }}>Same every time</span>
            {["Business name", "Base price", "Deposit"].map((t) => (
              <span key={t} style={{ display: "flex", fontSize: 17, color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 8, padding: "10px 14px" }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${YELLOW_BORDER}`, backgroundColor: YELLOW_BG, borderRadius: 12, padding: 20 }}>
            <span style={{ fontSize: 16, color: "#854d0e" }}>Filled in per rental</span>
            {["Renter name", "Vessel", "Rental date"].map((t) => (
              <span key={t} style={{ display: "flex", fontSize: 17, color: "#854d0e", backgroundColor: "#ffffff", borderRadius: 8, padding: "10px 14px" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "start-document",
    label: "Dashboard · Templates",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Start from a template</span>
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f1f5f9", display: "flex" }} />
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0f172a" }}>Boat &amp; Jet Ski Rental Agreement</span>
          </div>
          <span style={{ display: "flex", fontSize: 17, fontWeight: 600, color: "#111827", backgroundColor: YELLOW, padding: "10px 20px", borderRadius: 10 }}>Use template</span>
        </div>
      </div>
    ),
  },
  {
    slug: "add-recipient",
    label: "New Document · Recipients",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Add the renter as a recipient</span>
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 22px" }}>
          <span style={{ fontSize: 16, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 14px", borderRadius: 999, display: "flex" }}>Renter</span>
          <span style={{ fontSize: 18, color: "#94a3b8", flex: 1 }}>renter@email.com</span>
          <span style={{ display: "flex", fontSize: 16, fontWeight: 600, color: "#111827", backgroundColor: YELLOW, padding: "9px 18px", borderRadius: 8 }}>Add</span>
        </div>
      </div>
    ),
  },
  {
    slug: "send-actions",
    label: "Document · Signers",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Sent — ready to share</span>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0f172a" }}>Jane Renter</span>
            <span style={{ marginTop: 4, fontSize: 16, color: "#94a3b8" }}>renter@email.com</span>
          </div>
          <span style={{ display: "flex", fontSize: 15, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 16px", borderRadius: 999 }}>Sent</span>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 14 }}>
          {["Copy link", "Share to sign", "QR to sign"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 999, padding: "10px 18px" }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: "#94a3b8", display: "flex" }} />
              <span style={{ fontSize: 16, color: "#334155" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: "notified",
    label: "Dashboard · Documents",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Signed — you are notified instantly</span>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 22px" }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#0f172a" }}>Jane Renter — Jet Ski Rental</span>
          <span style={{ display: "flex", fontSize: 15, color: "#166534", backgroundColor: "#dcfce7", padding: "6px 16px", borderRadius: 999 }}>Signed</span>
        </div>
        <div
          style={{
            marginTop: 24,
            alignSelf: "flex-end",
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 20px",
            boxShadow: "0 12px 24px -12px rgba(15, 23, 42, 0.25)",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#22c55e", display: "flex" }} />
          <span style={{ fontSize: 16, color: "#334155" }}>Renter signed the agreement</span>
        </div>
      </div>
    ),
  },
  {
    slug: "reminder",
    label: "Document · Signers",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Send a reminder</span>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0f172a" }}>Jane Renter</span>
            <span style={{ marginTop: 4, fontSize: 16, color: "#94a3b8" }}>Sent 2 days ago · not signed yet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 999, padding: "10px 18px" }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: "#94a3b8", display: "flex" }} />
            <span style={{ fontSize: 16, color: "#334155" }}>Send reminder</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "audit-trail",
    label: "Document · Audit trail",
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>The record stays put</span>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["Document sent", "Aug 7, 10:02am"],
            ["Renter viewed", "Aug 7, 10:14am"],
            ["Renter signed", "Aug 7, 10:19am"],
            ["Certificate generated", "Aug 7, 10:19am"],
          ].map(([label, ts]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: "#dcfce7", display: "flex" }} />
              <span style={{ fontSize: 18, color: "#334155", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 16, color: "#94a3b8" }}>{ts}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

async function main() {
  const outDir = path.join(process.cwd(), "public");
  for (const step of STEPS) {
    const image = new ImageResponse(frame(step.label, step.content), { width: WIDTH, height: HEIGHT });
    const buf = Buffer.from(await image.arrayBuffer());
    const outPath = path.join(outDir, `guide-boat-${step.slug}.png`);
    await fs.writeFile(outPath, buf);
    console.log(`Wrote ${outPath} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
