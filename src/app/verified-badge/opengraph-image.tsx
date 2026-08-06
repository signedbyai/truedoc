import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Route-scoped, same pattern as /magic-quote, /developers, /console's own
// opengraph-image.tsx files — but unlike those (pure text/copy layouts),
// this one embeds the actual Verified Badge card image rather than just
// describing it. Deliberate: the whole page's pitch is "show, don't just
// claim" (see page.tsx's hero section and its own real badge image), and
// a share card that only used text would undersell the one visual thing
// that makes this feature legible at a glance — a real QR code on a real
// card. Reuses the same public/hero-verified-badge.png asset the page's
// hero section renders (badge-asset.tsx's generateVerifiedBadgeImage
// output, saved to disk) rather than re-generating a fresh QR here, so
// the OG card and the page always show byte-identical badge art and can
// never drift out of sync with whatever the QR currently points to.
export const alt = "SignedBy Verified Badge — proof your work is genuinely yours, sealed by a verified human";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadBadgeDataUri(): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "hero-verified-badge.png");
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function VerifiedBadgeOpengraphImage() {
  const badgeDataUri = await loadBadgeDataUri();
  // Source badge is 640x820 (badge-asset.tsx); scaled down to fit this
  // card's 630px height with room for padding, aspect ratio preserved.
  const badgeHeight = 520;
  const badgeWidth = Math.round(badgeHeight * (640 / 820));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "0 70px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 620 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#94a3b8" }}>
            VERIFIED BADGE
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5, lineHeight: 1.15 }}>
              Don&apos;t let a flawed
            </span>
            <span style={{ marginTop: 4, display: "flex", alignItems: "center", fontSize: 52, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
              AI detector{" "}
              <span style={{ marginLeft: 14, backgroundColor: "#fde047", padding: "2px 20px", borderRadius: 6 }}>
                ruin things.
              </span>
            </span>
          </div>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", fontSize: 26, fontWeight: 500, color: "#475569" }}>
            <span>Seal your finished file as unaltered</span>
            <span style={{ marginTop: 4 }}>and identity-verified. No account needed to check it.</span>
          </div>
          {/* FIXED 2026-08-06 (top-of-funnel review) — this pill still read
              "Pro plan+ · Console/MCP" from before the 2026-08-01 Free-tier
              pivot and the 2026-08-05 dashboard-native pivot
              (VERIFIED_BADGE_DASHBOARD_SCOPE.md): sealing is free on every
              plan and dashboard-native now, not Pro+/Console-MCP-only. Left
              uncorrected, this was the first thing a cold Reddit/LinkedIn
              click saw before the page itself even loaded — actively
              misleading exactly the free-tier audience this page targets. */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "center",
              border: "2px solid #e2e8f0",
              color: "#334155",
              fontSize: 22,
              fontWeight: 600,
              padding: "14px 28px",
              borderRadius: 40,
              alignSelf: "flex-start",
            }}
          >
            Free to start · Every plan
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
          <img
            src={badgeDataUri}
            width={badgeWidth}
            height={badgeHeight}
            alt=""
            style={{ borderRadius: 20 }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
