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
// chrome mockups, which didn't match the page's own hero (a bezel-less
// portrait phone shot, see generate-hero-boat-jet-ski-rental-qr-signing.tsx).
//
// Rebuilt AGAIN same day, larger/bolder type: the page was displaying these
// capped at 320px wide (max-w-xs) while the canvas was authored at 1170px
// with real-phone-sized body text (16-19px) -- a ~27% scale-down that made
// 16-19px text land around 4-5px on screen, illegible on any device. Fixed
// by bumping every font/icon/padding here ~35-40% AND widening the display
// in page.tsx.
//
// Rebuilt a THIRD time same day, actual phone chrome: even with mobile
// copy/layout and bigger type, these still read as generic flat cards --
// no status bar, no notch, no home indicator -- so nothing signaled "this
// is a phone screen" the way the hero's bottom-sheet + QR code did. Added a
// proper (still abstracted, not literal-iOS) status bar -- "9:41" + signal
// bars + a battery pill -- and a home indicator bar around every step's
// content.
//
// First attempt at this also switched every step to one uniform tall
// canvas (1170x2350, close to a real device's aspect ratio) instead of
// per-step content-fit heights -- reasoning that a mostly-blank phone
// screen below a short card is realistic. It's realistic, but it's also
// up to ~1900px of pure blank scroll per light-content step in an article
// with ten of these back to back -- a bad tradeoff. Reverted to per-step
// heights (each with a little extra room over the pre-chrome version for
// the status bar/home indicator), so this reads as "a real phone screen,
// cropped to where the content ends" rather than "an empty phone screen."
// The status bar alone is enough to signal "phone" regardless of exact
// aspect ratio -- see how App Store/product-gallery screenshots routinely
// crop to content while keeping the status bar for authenticity.
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const WIDTH = 1170;
const YELLOW = "#eab308";
const YELLOW_BG = "#fefce8";
const YELLOW_BORDER = "#fde047";
const DARK = "#0f172a";

function frame(label: string, content: React.ReactNode, height: number) {
  return (
    <div style={{ width: WIDTH, height, display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      {/* Status bar -- abstracted, not a literal iOS/Android recreation, same
          "plain shapes instead of real icons" house style as everywhere else
          in this mockup. Just enough (time + signal bars + battery pill) to
          read unmistakably as "phone" at a glance. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 44px 0 44px" }}>
        <span style={{ fontSize: 25, fontWeight: 700, color: DARK }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
            {[9, 13, 17, 21].map((h, i) => (
              <div key={i} style={{ width: 6, height: h, borderRadius: 1, backgroundColor: DARK, display: "flex" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 32, height: 16, borderRadius: 4, border: `2px solid ${DARK}`, display: "flex", padding: 2 }}>
              <div style={{ flex: 1, backgroundColor: DARK, borderRadius: 1, display: "flex" }} />
            </div>
            <div style={{ width: 3, height: 7, backgroundColor: DARK, marginLeft: 2, borderRadius: 1, display: "flex" }} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px 48px 40px 48px" }}>
        <span style={{ fontSize: 27, color: "#94a3b8" }}>{label}</span>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", flex: 1 }}>{content}</div>
      </div>

      {/* Home indicator */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 22 }}>
        <div style={{ width: 148, height: 6, borderRadius: 999, backgroundColor: DARK, display: "flex" }} />
      </div>
    </div>
  );
}

const STEPS: { slug: string; label: string; height: number; content: React.ReactNode }[] = [
  {
    slug: "upload-form",
    label: "New Document · Sign tab",
    height: 1300,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Upload your rental agreement</span>
        <div
          style={{
            marginTop: 38,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "3px dashed #cbd5e1",
            borderRadius: 20,
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ width: 86, height: 86, borderRadius: 18, backgroundColor: "#e2e8f0", display: "flex" }} />
          <span style={{ marginTop: 30, fontSize: 27, color: "#64748b", textAlign: "center", paddingLeft: 40, paddingRight: 40, lineHeight: 1.3 }}>
            Tap to choose a PDF, or take a photo of your paper form
          </span>
          <div
            style={{
              marginTop: 30,
              display: "flex",
              alignItems: "center",
              gap: 14,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "16px 26px",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: YELLOW, display: "flex" }} />
            <span style={{ fontSize: 24, color: "#334155" }}>boat-rental-agreement.pdf</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "detected-signers",
    label: "New Document · Detected signers",
    height: 1200,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>We detected 2 signers</span>
        <span style={{ marginTop: 12, fontSize: 26, color: "#64748b" }}>Confirm and add an email for each party.</span>
        <div style={{ marginTop: 38, display: "flex", flexDirection: "column", gap: 22 }}>
          {[
            ["Owner", "you@marinadelsol.com"],
            ["Renter", "renter@email.com"],
          ].map(([role, email]) => (
            <div key={role} style={{ display: "flex", flexDirection: "column", gap: 14, border: "1px solid #e2e8f0", borderRadius: 18, padding: "24px 26px" }}>
              <span style={{ alignSelf: "flex-start", fontSize: 22, color: "#334155", backgroundColor: "#f1f5f9", padding: "8px 18px", borderRadius: 999, display: "flex" }}>
                {role}
              </span>
              <span style={{ fontSize: 25, color: "#94a3b8" }}>{email}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <span
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 600,
            color: "#111827",
            backgroundColor: YELLOW,
            padding: "24px 30px",
            borderRadius: 18,
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
    height: 1450,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Review the suggested fields</span>
        <div style={{ marginTop: 32, position: "relative", flex: 1, display: "flex", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20 }}>
          <div
            style={{
              position: "absolute",
              top: 56,
              left: 48,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `3px dashed ${YELLOW_BORDER}`,
              borderRadius: 10,
              padding: "14px 22px",
            }}
          >
            <span style={{ fontSize: 23, color: "#854d0e" }}>Signature</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 230,
              left: 48,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `3px dashed ${YELLOW_BORDER}`,
              borderRadius: 10,
              padding: "14px 22px",
            }}
          >
            <span style={{ fontSize: 23, color: "#854d0e" }}>Date</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 404,
              right: 48,
              display: "flex",
              alignItems: "center",
              backgroundColor: YELLOW_BG,
              border: `3px dashed ${YELLOW_BORDER}`,
              borderRadius: 10,
              padding: "14px 22px",
            }}
          >
            <span style={{ fontSize: 23, color: "#854d0e" }}>Initials</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "fixed-vs-rental",
    label: "New Document · Field editor",
    height: 1050,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Fixed vs. per-rental fields</span>
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, border: "1px solid #e2e8f0", borderRadius: 18, padding: 28 }}>
            <span style={{ fontSize: 22, color: "#64748b" }}>Same every time</span>
            {["Business name", "Base price", "Deposit"].map((t) => (
              <span key={t} style={{ display: "flex", fontSize: 24, color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 10, padding: "14px 18px" }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, border: `1px solid ${YELLOW_BORDER}`, backgroundColor: YELLOW_BG, borderRadius: 18, padding: 28 }}>
            <span style={{ fontSize: 22, color: "#854d0e" }}>Filled in per rental</span>
            {["Renter name", "Vessel", "Rental date"].map((t) => (
              <span key={t} style={{ display: "flex", fontSize: 24, color: "#854d0e", backgroundColor: "#ffffff", borderRadius: 10, padding: "14px 18px" }}>
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
    height: 650,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Start from a template</span>
        <div style={{ marginTop: 38, display: "flex", flexDirection: "column", gap: 28, border: "1px solid #e2e8f0", borderRadius: 20, padding: "32px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 66, height: 66, borderRadius: 16, backgroundColor: "#f1f5f9", display: "flex" }} />
            <span style={{ fontSize: 27, fontWeight: 600, color: DARK, lineHeight: 1.25 }}>Boat &amp; Jet Ski Rental Agreement</span>
          </div>
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 25,
              fontWeight: 600,
              color: "#111827",
              backgroundColor: YELLOW,
              padding: "22px 26px",
              borderRadius: 16,
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
    height: 670,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Add the renter as a recipient</span>
        <div style={{ marginTop: 38, display: "flex", flexDirection: "column", gap: 22, border: "1px solid #e2e8f0", borderRadius: 20, padding: "32px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ alignSelf: "flex-start", fontSize: 22, color: "#334155", backgroundColor: "#f1f5f9", padding: "8px 18px", borderRadius: 999, display: "flex" }}>
              Renter
            </span>
            <span style={{ fontSize: 25, color: "#94a3b8" }}>renter@email.com</span>
          </div>
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 25,
              fontWeight: 600,
              color: "#111827",
              backgroundColor: YELLOW,
              padding: "20px 24px",
              borderRadius: 14,
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
    height: 910,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Sent — ready to share</span>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 8, border: "1px solid #e2e8f0", borderRadius: 20, padding: "28px 28px" }}>
          <span style={{ fontSize: 29, fontWeight: 600, color: DARK }}>Jane Renter</span>
          <span style={{ fontSize: 23, color: "#94a3b8" }}>renter@email.com</span>
          <span style={{ alignSelf: "flex-start", marginTop: 8, display: "flex", fontSize: 21, color: "#334155", backgroundColor: "#f1f5f9", padding: "8px 20px", borderRadius: 999 }}>
            Sent
          </span>
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {["Copy link", "Share to sign", "QR to sign"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 26px" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#94a3b8", display: "flex" }} />
              <span style={{ fontSize: 25, color: "#334155" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: "notified",
    label: "Dashboard · Documents",
    height: 1250,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: DARK, lineHeight: 1.2 }}>Signed — you&apos;re notified instantly</span>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 16, border: "1px solid #e2e8f0", borderRadius: 20, padding: "28px 28px" }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: DARK, lineHeight: 1.3 }}>Jane Renter — Jet Ski Rental</span>
          <span style={{ alignSelf: "flex-start", display: "flex", fontSize: 21, color: "#166534", backgroundColor: "#dcfce7", padding: "8px 20px", borderRadius: 999 }}>
            Signed
          </span>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div
          style={{
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: 14,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: "22px 26px",
            boxShadow: "0 12px 24px -12px rgba(15, 23, 42, 0.25)",
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: "#22c55e", display: "flex" }} />
          <span style={{ fontSize: 24, color: "#334155" }}>Renter signed the agreement</span>
        </div>
      </div>
    ),
  },
  {
    slug: "reminder",
    label: "Document · Signers",
    height: 670,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>Send a reminder</span>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 24, border: "1px solid #e2e8f0", borderRadius: 20, padding: "28px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 29, fontWeight: 600, color: DARK }}>Jane Renter</span>
            <span style={{ fontSize: 23, color: "#94a3b8" }}>Sent 2 days ago · not signed yet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#94a3b8", display: "flex" }} />
            <span style={{ fontSize: 25, color: "#334155" }}>Send reminder</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "audit-trail",
    label: "Document · Audit trail",
    height: 950,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: DARK }}>The record stays put</span>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            ["Document sent", "Aug 7, 10:02am"],
            ["Renter viewed", "Aug 7, 10:14am"],
            ["Renter signed", "Aug 7, 10:19am"],
            ["Certificate generated", "Aug 7, 10:19am"],
          ].map(([label, ts]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: "#dcfce7", display: "flex" }} />
                <span style={{ fontSize: 25, color: "#334155" }}>{label}</span>
              </div>
              <span style={{ fontSize: 21, color: "#94a3b8", marginLeft: 40 }}>{ts}</span>
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
