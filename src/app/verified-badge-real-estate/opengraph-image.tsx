import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Same pattern as /verified-badge-invoices/opengraph-image.tsx -- embeds
// this page's own hero, hero-verified-badge-real-estate.png (the badge in
// context on a closing statement), not the isolated badge card, so the
// share card matches what this page actually leads with.
export const alt = "SignedBy Verified Badge — prove your closing documents are genuinely from you, not a scam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadHeroDataUri(): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "hero-verified-badge-real-estate.png");
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function VerifiedBadgeRealEstateOpengraphImage() {
  const heroDataUri = await loadHeroDataUri();
  // Source hero is 640x820 (generate-hero-real-estate.tsx); scaled down to
  // fit this card's 630px height with room for padding, aspect ratio
  // preserved -- same math as the invoices page's own opengraph-image.
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
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "#94a3b8" }}>
            VERIFIED BADGE FOR REAL ESTATE
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5, lineHeight: 1.15 }}>
              Wire fraud costs buyers
            </span>
            <span style={{ marginTop: 4, display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
              real{" "}
              <span style={{ marginLeft: 14, backgroundColor: "#fde047", padding: "2px 20px", borderRadius: 6 }}>
                money.
              </span>
            </span>
          </div>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", fontSize: 26, fontWeight: 500, color: "#475569" }}>
            <span>Prove your closing documents are</span>
            <span style={{ marginTop: 4 }}>genuinely from you.</span>
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
