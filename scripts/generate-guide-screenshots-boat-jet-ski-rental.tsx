// Generator for the ten inline step mockups on /boat-jet-ski-rental/guide,
// run via:
//   npx tsx scripts/generate-guide-screenshots-boat-jet-ski-rental.tsx
//
// Same next/og ImageResponse approach as every other one-off generator in
// this app (see generate-hero-boat-jet-ski-rental-qr-signing.tsx) -- no
// browser/Chromium/root install needed, which the sandbox doesn't have.
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
// Rebuilt same day, portrait/mobile: "almost all operators use their
// mobile" -- these ten were originally landscape 1200x750 desktop-browser-
// chrome mockups (three dots + "New Document · Sign tab" style top bar),
// which didn't match the page's own hero (a bezel-less portrait phone
// shot, see generate-hero-boat-jet-ski-rental-qr-signing.tsx). Rebuilt
// bezel-less/portrait to match: same WIDTH/palette conventions as that
// hero, same "stack vertically, full-width buttons pinned to the bottom"
// mobile layout patterns instead of the desktop two-column/space-between
// layouts the originals used (e.g. fixed-vs-rental's side-by-side columns
// are now stacked; add-recipient's inline Add button is now full-width
// below the field). Copy on the upload step also changed from
// drag-and-drop language ("Drop a PDF here, or click to upload") to
// mobile-appropriate language ("Tap to choose a PDF, or take a photo of
// your paper form").
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1170;
const YELLOW = "#eab308";
const YELLOW_BG = "#fefce8";
const YELLOW_BORDER = "#fde047";
const DARK = "#0f172a";

// Height varies per step instead of one fixed canvas -- the original
// single-HEIGHT version left huge dead white space under the card-only
// steps (add-recipient, fixed-vs-rental, etc.) while the full-screen ones
// (upload's dropzone, the document canvas, the pinned-bottom CTA screens)
// wanted to stay tall. Sized to each step's actual content instead.
function frame(label: string, content: React.ReactNode, height: number) {
  return (
    <div style={{ width: WIDTH, height, display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 44px 48px 44px" }}>
        <span style={{ fontSize: 20, color: "#94a3b8" }}>{label}</span>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", flex: 1 }}>{content}</div>
      </div>
    </div>
  );
}

const STEPS: { slug: string; label: string; height: number; content: React.ReactNode }[] = [
  {
    slug: "upload-form",
    label: "New Document · Sign tab",
    height: 1000,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Upload your rental agreement</span>
        <div
          style={{
            marginTop: 28,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #cbd5e1",
            borderRadius: 16,
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: "#e2e8f0", display: "flex" }} />
          <span style={{ marginTop: 22, fontSize: 20, color: "#64748b", textAlign: "center", paddingLeft: 30, paddingRight: 30 }}>
            Tap to choose a PDF, or take a photo of your paper form
          </span>
          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "12px 20px",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: YELLOW, display: "flex" }} />
            <span style={{ fontSize: 17, color: "#334155" }}>boat-rental-agreement.pdf</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "detected-signers",
    label: "New Document · Detected signers",
    height: 900,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>We detected 2 signers</span>
        <span style={{ marginTop: 8, fontSize: 19, color: "#64748b" }}>Confirm and add an email for each party.</span>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["Owner", "you@marinadelsol.com"],
            ["Renter", "renter@email.com"],
          ].map(([role, email]) => (
            <div key={role} style={{ display: "flex", flexDirection: "column", gap: 10, border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
              <span style={{ alignSelf: "flex-start", fontSize: 16, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 14px", borderRadius: 999, display: "flex" }}>
                {role}
              </span>
              <span style={{ fontSize: 18, color: "#94a3b8" }}>{email}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <span
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 19,
            fontWeight: 600,
            color: "#111827",
            backgroundColor: YELLOW,
            padding: "18px 24px",
            borderRadius: 14,
          }}
        >
          Confirm &amp; continue
        </span>
      </div>
    ),
  },
  {
    slug: "review-fields",
    label: "New Document · Field editor",
    height: 1150,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Review the suggested fields</span>
        <div style={{ marginTop: 24, position: "relative", flex: 1, display: "flex", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16 }}>
          <div
            style={{
              position: "absolute",
              top: 44,
              left: 40,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "10px 16px",
            }}
          >
            <span style={{ fontSize: 16, color: "#854d0e" }}>Signature</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 160,
              left: 40,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "10px 16px",
            }}
          >
            <span style={{ fontSize: 16, color: "#854d0e" }}>Date</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 260,
              right: 40,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `2px dashed ${YELLOW_BORDER}`,
              borderRadius: 8,
              padding: "10px 16px",
            }}
          >
            <span style={{ fontSize: 16, color: "#854d0e" }}>Initials</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "fixed-vs-rental",
    label: "New Document · Field editor",
    height: 760,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Fixed vs. per-rental fields</span>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 }}>
            <span style={{ fontSize: 16, color: "#64748b" }}>Same every time</span>
            {["Business name", "Base price", "Deposit"].map((t) => (
              <span key={t} style={{ display: "flex", fontSize: 17, color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 8, padding: "10px 14px" }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${YELLOW_BORDER}`, backgroundColor: YELLOW_BG, borderRadius: 14, padding: 20 }}>
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
    height: 460,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Start from a template</span>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20, border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#f1f5f9", display: "flex" }} />
            <span style={{ fontSize: 20, fontWeight: 600, color: DARK }}>Boat &amp; Jet Ski Rental Agreement</span>
          </div>
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              backgroundColor: YELLOW,
              padding: "16px 20px",
              borderRadius: 12,
            }}
          >
            Use template
          </span>
        </div>
      </div>
    ),
  },
  {
    slug: "add-recipient",
    label: "New Document · Recipients",
    height: 420,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Add the renter as a recipient</span>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16, border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 14px", borderRadius: 999, display: "flex" }}>Renter</span>
            <span style={{ fontSize: 18, color: "#94a3b8" }}>renter@email.com</span>
          </div>
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 600,
              color: "#111827",
              backgroundColor: YELLOW,
              padding: "14px 18px",
              borderRadius: 10,
            }}
          >
            Add
          </span>
        </div>
      </div>
    ),
  },
  {
    slug: "send-actions",
    label: "Document · Signers",
    height: 560,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Sent — ready to share</span>
        <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: DARK }}>Jane Renter</span>
            <span style={{ marginTop: 4, fontSize: 17, color: "#94a3b8" }}>renter@email.com</span>
          </div>
          <span style={{ display: "flex", fontSize: 15, color: "#334155", backgroundColor: "#f1f5f9", padding: "6px 16px", borderRadius: 999 }}>Sent</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {["Copy link", "Share to sign", "QR to sign"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#94a3b8", display: "flex" }} />
              <span style={{ fontSize: 18, color: "#334155" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: "notified",
    label: "Dashboard · Documents",
    height: 700,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Signed — you&apos;re notified instantly</span>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12, border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 22px" }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: DARK }}>Jane Renter — Jet Ski Rental</span>
          <span style={{ alignSelf: "flex-start", display: "flex", fontSize: 15, color: "#166534", backgroundColor: "#dcfce7", padding: "6px 16px", borderRadius: 999 }}>
            Signed
          </span>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div
          style={{
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "16px 20px",
            boxShadow: "0 12px 24px -12px rgba(15, 23, 42, 0.25)",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#22c55e", display: "flex" }} />
          <span style={{ fontSize: 17, color: "#334155" }}>Renter signed the agreement</span>
        </div>
      </div>
    ),
  },
  {
    slug: "reminder",
    label: "Document · Signers",
    height: 420,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>Send a reminder</span>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 18, border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: DARK }}>Jane Renter</span>
            <span style={{ marginTop: 4, fontSize: 17, color: "#94a3b8" }}>Sent 2 days ago · not signed yet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#94a3b8", display: "flex" }} />
            <span style={{ fontSize: 18, color: "#334155" }}>Send reminder</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "audit-trail",
    label: "Document · Audit trail",
    height: 600,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK }}>The record stays put</span>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["Document sent", "Aug 7, 10:02am"],
            ["Renter viewed", "Aug 7, 10:14am"],
            ["Renter signed", "Aug 7, 10:19am"],
            ["Certificate generated", "Aug 7, 10:19am"],
          ].map(([label, ts]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: "#dcfce7", display: "flex" }} />
                <span style={{ fontSize: 18, color: "#334155" }}>{label}</span>
              </div>
              <span style={{ fontSize: 15, color: "#94a3b8", marginLeft: 30 }}>{ts}</span>
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
    const image = new ImageResponse(frame(step.label, step.content, step.height), { width: WIDTH, height: step.height });
    const buf = Buffer.from(await image.arrayBuffer());
    const outPath = path.join(outDir, `guide-boat-${step.slug}.png`);
    await fs.writeFile(outPath, buf);
    console.log(`Wrote ${outPath} (${WIDTH}x${step.height}, ${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
