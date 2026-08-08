// Generator for the eight inline step mockups on
// /verified-badge-invoices/guide, run via:
//   npx tsx scripts/generate-guide-screenshots-verified-badge-invoices.tsx
//
// First badge-vertical guide (vertical-guide-pages-scope memory, 2026-08-08):
// unlike /boat-jet-ski-rental/guide (a send/recipient/QR-in-person-signing
// flow), the Verified Badge flow has no recipient, no template, no signing
// session -- it's (1) verify identity once via Stripe-hosted ID check,
// (2) seal the finished file (hash + RFC 3161 timestamp, badge generated),
// (3) embed the badge before sending; the recipient scans the QR and lands
// on a public /verify page. None of the boat-rental guide's STEP CONTENT
// transfers -- only the generation technique and page chrome do (same
// phone-chrome frame() below, same GuideStep type in page.tsx, same
// per-step content-fit canvas heights).
//
// Every screen here is a stylized mockup of the REAL dashboard flow
// (New Document -> Verified Badge tab, new-document-client.tsx), not a
// literal screenshot -- same "abstracted icons, real copy" house style as
// generate-guide-screenshots-boat-jet-ski-rental.tsx. Copy is pulled
// directly from that component and from src/app/dashboard/documents/[id]/
// page.tsx's post-seal output row and src/app/verify/page.tsx's result
// card, not invented.
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// deck-icons/Check-emerald.png, not the Unicode "✓" glyph -- Satori's
// bundled default font has no checkmark glyph, and this sandbox has no
// network access to fetch Satori's usual Google Fonts fallback for it, so
// the character renders as a tofu box (confirmed the hard way running this
// script; same issue generate-deck-icons.mjs's own Check-emerald comment
// already documents from the pitch deck's Verification slide). Read
// synchronously at module load, not via fs/promises, since the STEPS array
// below builds its JSX synchronously too.
const checkIconDataUri = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), "public", "deck-icons", "Check-emerald.png")
).toString("base64")}`;

// deck-icons/ShieldCheck.png (navy) -- the actual icon the real Verified
// Badge tab uses (new-document-client.tsx line 739: ShieldCheck in the
// yellow header badge; line 897: same icon on the "Seal this file" button).
// A placeholder rounded-square outline stood in for this before (2026-08-08
// direct ask: "the icon in the badge and the button i believe was a
// shield") -- fixed to reuse the real deck-icons asset instead of
// approximating the shape by hand.
const shieldIconDataUri = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), "public", "deck-icons", "ShieldCheck.png")
).toString("base64")}`;

const WIDTH = 1170;
// Was #eab308 (Tailwind yellow-500) -- didn't match the app's actual yellow.
// The real badge/button both use bg-yellow-300 (new-document-client.tsx
// lines 738 & button.tsx's `cta` variant), and the brand mark itself
// (src/app/icon.svg) is the same #FDE047. Fixed 2026-08-08 direct ask.
const YELLOW = "#FDE047";
const YELLOW_BG = "#fefce8";
const DARK = "#0f172a";
const VIOLET = "#7c3aed";
const BLUE_BG = "#eff6ff";
const BLUE_BORDER = "#bfdbfe";
const BLUE_TEXT = "#1e40af";
const EMERALD = "#059669";
const EMERALD_BG = "#ecfdf5";
const EMERALD_BORDER = "#a7f3d0";

// Same phone-chrome frame as the boat-rental guide's generator -- status
// bar + home indicator, per-step content-fit height. Copied rather than
// imported (that script has no exports; both are one-off build scripts,
// not shared library code).
function frame(label: string, content: React.ReactNode, height: number) {
  return (
    <div style={{ width: WIDTH, height, display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
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

      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 22 }}>
        <div style={{ width: 148, height: 6, borderRadius: 999, backgroundColor: DARK, display: "flex" }} />
      </div>
    </div>
  );
}

// Shared header for every "Verified Badge tab" step -- yellow rounded-2xl
// icon badge + centered title/subtitle, exact same treatment as the real
// tab (new-document-client.tsx ~line 738).
function badgeTabHeader(title: string, subtitle: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", width: 76, height: 76, borderRadius: 22, backgroundColor: YELLOW, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
        <img src={shieldIconDataUri} width={38} height={38} alt="" />
      </div>
      <span style={{ marginTop: 18, fontSize: 34, fontWeight: 700, color: DARK }}>{title}</span>
      <span style={{ marginTop: 10, fontSize: 24, color: "#64748b", lineHeight: 1.35 }}>{subtitle}</span>
    </div>
  );
}

const STEPS: { slug: string; label: string; height: number; content: React.ReactNode }[] = [
  // ---- Part 1: verify your identity once ----
  {
    slug: "start-badge-tab",
    label: "New Document · Verified Badge",
    height: 1200,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {badgeTabHeader("Generate your Verified Badge", "Seal your first file to generate cryptographic proof it's unaltered and identity-verified.")}
        <div
          style={{
            marginTop: 44,
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
          <div style={{ width: 78, height: 78, borderRadius: 18, backgroundColor: "#e2e8f0", display: "flex" }} />
          <span style={{ marginTop: 26, fontSize: 26, color: "#64748b", textAlign: "center", paddingLeft: 40, paddingRight: 40 }}>
            Click to choose a PDF, or drag one here
          </span>
          <span style={{ marginTop: 8, fontSize: 20, color: "#94a3b8" }}>Up to 25MB</span>
        </div>
      </div>
    ),
  },
  {
    slug: "upload-first-invoice",
    label: "New Document · Verified Badge",
    height: 1000,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {badgeTabHeader("Generate your Verified Badge", "Seal your first file to generate cryptographic proof it's unaltered and identity-verified.")}
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "3px solid #cbd5e1", borderRadius: 20, backgroundColor: "#f8fafc", padding: "34px 20px" }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: YELLOW, display: "flex" }} />
          <span style={{ marginTop: 20, fontSize: 27, fontWeight: 600, color: DARK }}>invoice-INV-0148.pdf</span>
        </div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 22, color: "#334155" }}>Document title</span>
          <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 12, padding: "18px 20px" }}>
            <span style={{ fontSize: 25, color: DARK }}>Invoice INV-0148</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: YELLOW, borderRadius: 16, padding: "24px 26px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
          <img src={shieldIconDataUri} width={26} height={26} alt="" />
          <span style={{ fontSize: 27, fontWeight: 600, color: DARK }}>Seal this file</span>
        </div>
      </div>
    ),
  },
  {
    slug: "verify-identity",
    label: "New Document · Verified Badge",
    height: 650,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, border: `2px solid ${BLUE_BORDER}`, backgroundColor: BLUE_BG, borderRadius: 20, padding: "30px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, border: `4px solid ${BLUE_TEXT}`, display: "flex" }} />
            <span style={{ fontSize: 28, fontWeight: 600, color: BLUE_TEXT }}>Verify your identity to continue</span>
          </div>
          <span style={{ fontSize: 23, color: "#3b5998", lineHeight: 1.4 }}>
            One-time check before your first Verified Badge seal — reused for every seal after.
          </span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: VIOLET, borderRadius: 14, padding: "20px 24px" }}>
            <span style={{ fontSize: 25, fontWeight: 600, color: "#ffffff" }}>Verify identity</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <span style={{ fontSize: 22, color: "#94a3b8", textAlign: "center", lineHeight: 1.4 }}>
          Opens a secure government-ID check hosted by Stripe — usually under a minute.
        </span>
      </div>
    ),
  },
  {
    slug: "sealed-first",
    label: "New Document · Verified Badge",
    height: 700,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", width: 100, height: 100, borderRadius: 999, backgroundColor: EMERALD_BG, border: `4px solid ${EMERALD_BORDER}`, alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", width: 44, height: 44, borderRadius: 999, border: `7px solid ${EMERALD}` }} />
        </div>
        <span style={{ marginTop: 26, fontSize: 36, fontWeight: 700, color: DARK }}>Sealed</span>
        <span style={{ marginTop: 10, fontSize: 24, color: "#64748b", textAlign: "center" }}>
          Your Verified Badge is ready.
        </span>
      </div>
    ),
  },
  // ---- Part 2: every invoice after that ----
  {
    slug: "seal-next-invoice",
    label: "New Document · Verified Badge",
    height: 950,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {badgeTabHeader("Generate your Verified Badge", "Seal your first file to generate cryptographic proof it's unaltered and identity-verified.")}
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "3px solid #cbd5e1", borderRadius: 20, backgroundColor: "#f8fafc", padding: "30px 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: YELLOW, display: "flex" }} />
          <span style={{ marginTop: 18, fontSize: 26, fontWeight: 600, color: DARK }}>invoice-INV-0149.pdf</span>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: YELLOW, borderRadius: 16, padding: "24px 26px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
          <img src={shieldIconDataUri} width={26} height={26} alt="" />
          <span style={{ fontSize: 27, fontWeight: 600, color: DARK }}>Seal this file</span>
        </div>
        <span style={{ marginTop: 20, fontSize: 21, color: "#94a3b8", textAlign: "center" }}>
          No identity check this time — that only happens once.
        </span>
      </div>
    ),
  },
  {
    slug: "outputs-ready",
    label: "Dashboard · Document",
    height: 780,
    content: (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "#065f46", backgroundColor: "#dcfce7", padding: "8px 18px", borderRadius: 999 }}>Sealed</span>
          <span style={{ fontSize: 23, color: "#64748b" }}>Sealed with a Verified Badge.</span>
        </div>
        <span style={{ marginTop: 30, fontSize: 24, fontWeight: 600, color: DARK }}>Every seal produces:</span>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {["Badge image", "Sealed PDF", "Certificate", "Copy verify link", "QR to verify"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: "#94a3b8", display: "flex" }} />
              <span style={{ fontSize: 24, color: "#334155" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: "client-verifies",
    label: "signedby.ai/verify",
    height: 780,
    content: (
      // Copy pulled directly from src/app/verify/page.tsx's real result
      // card -- "✓ Sealed and identity-verified", the sealedBy name, then
      // File/Sealed/Identity verified/Trusted timestamp/Organization as
      // separate dt/dd rows, then the same careful "confirms... doesn't
      // certify the file's contents weren't AI-generated" footer sentence.
      // A phone-mockup version of the same content as the pitch deck's
      // hero-verify-result.png (a desktop/browser-chrome mockup) -- this
      // guide is phone-first throughout, so the client's own view gets the
      // same treatment as every other step here instead of reusing that
      // desktop asset.
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: DARK }}>Verify a document</span>
        <span style={{ marginTop: 10, fontSize: 22, color: "#64748b", lineHeight: 1.35 }}>
          Every document sealed with SignedBy gets a checksum. No account needed.
        </span>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 14, border: `2px solid ${EMERALD_BORDER}`, backgroundColor: EMERALD_BG, borderRadius: 20, padding: "28px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
            <img src={checkIconDataUri} width={24} height={24} alt="" />
            <span style={{ fontSize: 24, fontWeight: 600, color: "#047857" }}>Sealed and identity-verified</span>
          </div>
          <span style={{ fontSize: 27, fontWeight: 700, color: "#065f46" }}>A. Marlowe Design</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["File", "invoice-INV-0148.pdf"],
              ["Sealed", "Aug 6, 2026"],
              ["Identity verified", "Aug 6, 2026"],
              ["Trusted timestamp", "Sectigo (RFC 3161)"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                <span style={{ fontSize: 21, color: "#047857" }}>{k}</span>
                <span style={{ fontSize: 21, fontWeight: 600, color: "#065f46" }}>{v}</span>
              </div>
            ))}
          </div>
          <span style={{ marginTop: 4, fontSize: 19, color: "#0f766e", lineHeight: 1.45 }}>
            This confirms the file existed, unaltered, as of a cryptographically verified timestamp, sealed by a
            verified individual. It doesn&apos;t certify the file&apos;s contents weren&apos;t AI-generated — only that
            it hasn&apos;t changed since this timestamp.
          </span>
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
    const outPath = path.join(outDir, `guide-badge-invoice-${step.slug}.png`);
    await fs.writeFile(outPath, buf);
    console.log(`Wrote ${outPath} (${WIDTH}x${step.height}, ${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
