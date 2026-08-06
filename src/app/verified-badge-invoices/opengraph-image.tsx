import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Same pattern as /verified-badge/opengraph-image.tsx (see that file's own
// comment for the full reasoning) -- but embeds this page's own hero,
// hero-verified-badge-invoice.png (the badge in context on a real invoice),
// not the isolated badge card, so the share card matches what this page
// actually leads with.
export const alt = "SignedBy Verified Badge — prove your invoice is genuinely from you, not an AI fake";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadHeroDataUri(): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "hero-verified-badge-invoice.png");
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function VerifiedBadgeInvoicesOpengraphImage() {
  const heroDataUri = await loadHeroDataUri();
  // Source hero is 640x820 (generate-hero-mockup.tsx); scaled down to fit
  // this card's 630px height with room for padding, aspect ratio preserved.
  const heroHeight = 520;
  const heroWidth = Math.round(heroHeight * (640 / 820));

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
            <span style={{ fontSize: 48, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5, lineHeight: 1.15 }}>
              AI can fake an invoice
            </span>
            <span style={{ marginTop: 4, display: "flex", alignItems: "center", fontSize: 48, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
              in{" "}
              <span style={{ marginLeft: 14, backgroundColor: "#fde047", padding: "2px 20px", borderRadius: 6 }}>
                seconds.
              </span>
            </span>
          </div>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", fontSize: 26, fontWeight: 500, color: "#475569" }}>
            <span>Seal it first. Clients can check it&apos;s really</span>
            <span style={{ marginTop: 4 }}>from you — unaltered, identity-verified.</span>
          </div>
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
          {/* Satori's renderer (ImageResponse), not the DOM -- no-img-element doesn't apply to route files like this one. */}
          <img
            src={heroDataUri}
            width={heroWidth}
            height={heroHeight}
            alt=""
            style={{ borderRadius: 20 }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
