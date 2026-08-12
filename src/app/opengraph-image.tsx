import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Auto-wired by Next.js into both og:image and twitter:image meta tags for
// every page under this layout that doesn't have its own opengraph-image.tsx
// (metadata.twitter.card is set in layout.tsx).
//
// 2026-08-12, direct ask: "deploy preview-B as the new home page. update the
// OG card along with it (without the internal preview comment)." Replaces
// the old "Sign documents." card (faux-bold SignedBy wordmark, filled yellow
// highlight, generic "Start for free" pill) with the same design built for
// /home-preview-b's own opengraph-image.tsx, since that page's real content
// is now this one: this page's actual h1 copy/treatment (yellow underline
// on "E-signatures" only, not a filled block) and the same four Sign/Seal/
// Quote/Draft badges HomepageTier1Preview's IntroBadgeRow renders, using the
// exact lucide icon paths (copied verbatim from lucide-react's own source —
// see home-preview-b/opengraph-image.tsx's own comment for why raw SVG
// <path> data is used instead of the plain-CSS-shape workaround this file's
// previous version needed for text glyphs). The one difference from that
// route's card: no "Internal preview" pill — this is the real site now, so
// the vertical gap it used to fill is redistributed into more breathing room
// around the headline instead.
export const alt = "SignedBy — e-signatures without the per-seat tax. Sign, Seal, Quote, Draft.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0f172a";
const YELLOW = "#fde047";

async function loadLogoDataUri(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "brand",
    "signedby-lockup-yellow-badge-beta-micro-small.png"
  );
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Real icon paths, copied verbatim from lucide-react's own source
// (node_modules/lucide-react/dist/esm/icons/{signature,shield-check,
// receipt,sparkles}.mjs) — same four icons, same 24x24 viewBox/stroke
// styling lucide ships, matching IntroBadgeRow in homepage-tier1-preview.tsx
// exactly rather than approximated.
const ICON_PATHS: Record<string, string[]> = {
  Sign: [
    "m21 17-2.156-1.868A.5.5 0 0 0 18 15.5v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.545-3.991-3.97-8.5-4a1 1 0 0 0 0 5c4.153 0 4.745-11.295 5.708-13.5a2.5 2.5 0 1 1 3.31 3.284",
    "M3 21h18",
  ],
  Seal: [
    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    "m9 12 2 2 4-4",
  ],
  Quote: [
    "M12 17V7",
    "M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8",
    "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
  ],
  Draft: [
    "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
    "M20 2v4",
    "M22 4h-4",
  ],
};
// Sparkles' 4th shape is a circle, not a path — drawn separately below
// since it needs its own <circle>, not a <path d="...">.
const DRAFT_CIRCLE = { cx: "4", cy: "20", r: "2" };

function Badge({ label }: { label: string }) {
  const paths = ICON_PATHS[label];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 96,
          height: 96,
          borderRadius: 22,
          backgroundColor: YELLOW,
        }}
      >
        <svg
          width={48}
          height={48}
          viewBox="0 0 24 24"
          fill="none"
          stroke={NAVY}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
          {label === "Draft" && <circle cx={DRAFT_CIRCLE.cx} cy={DRAFT_CIRCLE.cy} r={DRAFT_CIRCLE.r} />}
        </svg>
      </div>
      <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: NAVY }}>{label}</div>
    </div>
  );
}

export default async function OpengraphImage() {
  const logoDataUri = await loadLogoDataUri();
  // Source logo is 266x64 (public/brand/...png) — scaled up from the page
  // header's own 29px-tall rendering to read clearly at share-card size,
  // aspect ratio preserved.
  const logoHeight = 48;
  const logoWidth = Math.round(logoHeight * (266 / 64));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "50px 70px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
        <img src={logoDataUri} width={logoWidth} height={logoHeight} alt="" />

        {/* Real h1 copy/treatment from homepage-tier1-preview.tsx: only
            "E-signatures" carries the yellow underline, same as the live
            markup — not the comma or the rest of the sentence. Manually
            broken into two lines rather than relying on Satori to wrap
            text itself. */}
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: NAVY, letterSpacing: -1.5 }}>
            <span style={{ borderBottom: `6px solid ${YELLOW}`, paddingBottom: 4 }}>E-signatures</span>
            <span>,</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", fontSize: 60, fontWeight: 700, color: NAVY, letterSpacing: -1.5 }}>
            without the per-seat tax
          </div>
        </div>

        {/* No "Internal preview" pill here — unlike home-preview-b's own OG
            card, this is the real live homepage. The vertical gap that pill
            used to fill (~90px there) is folded into the two margins below
            instead, so the badge row still lands with the same balanced
            spacing rather than crowding up under the headline. */}
        <div style={{ marginTop: 76, display: "flex", flexDirection: "row", gap: 56 }}>
          <Badge label="Sign" />
          <Badge label="Seal" />
          <Badge label="Quote" />
          <Badge label="Draft" />
        </div>
      </div>
    ),
    { ...size }
  );
}
