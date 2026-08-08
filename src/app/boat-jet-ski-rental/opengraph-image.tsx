import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Same pattern as /verified-badge-invoices and /verified-badge-real-estate's
// opengraph-image.tsx -- embeds this page's own hero(es), not a generic
// card, so the share preview matches what the page actually leads with.
// Previously this route had no colocated opengraph-image.tsx (see the
// SHARED_IMAGE comment that used to live in page.tsx) and silently fell
// back to the root layout's generic one.
//
// This page's hero is a two-layer composition (hero-boat-jet-ski-rental.png
// as the document panel, hero-signer-mobile.png overlapping its corner --
// see page.tsx's own hero comment), so this card reproduces both layers at
// OG scale rather than just the document, to stay recognizable as the same
// page when someone's already seen it.
export const alt = "Boat & jet ski rental agreements, signed before they leave the dock — SignedBy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadDataUri(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", filename);
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function BoatJetSkiRentalOpengraphImage() {
  const [docDataUri, phoneDataUri] = await Promise.all([
    loadDataUri("hero-boat-jet-ski-rental.png"),
    loadDataUri("hero-signer-mobile.png"),
  ]);

  // Document mockup is 1562x1070 (generate-hero-boat-jet-ski-rental.tsx);
  // scaled to fit this card's height with room for the text column and
  // padding, aspect ratio preserved -- same math as the real-estate page's
  // own opengraph-image.
  const docHeight = 380;
  const docWidth = Math.round(docHeight * (1562 / 1070));

  // Phone shot is 1236x2370 (the same reused signer-mobile asset the guide
  // and homepage use); sized small, matching its proportionally small
  // corner-overlap role on the live page rather than the near-equal footing
  // real-estate's opengraph-image gives its single hero.
  const phoneHeight = 168;
  const phoneWidth = Math.round(phoneHeight * (1236 / 2370));

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
          padding: "0 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#94a3b8" }}>
            FOR BOAT &amp; JET SKI RENTAL OPERATORS
          </div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: "#0f172a", letterSpacing: -1.3, lineHeight: 1.15 }}>
              Stop losing weekend
            </span>
            <span style={{ marginTop: 4, display: "flex", alignItems: "center", fontSize: 42, fontWeight: 700, color: "#0f172a", letterSpacing: -1.3 }}>
              revenue to{" "}
              <span style={{ marginLeft: 14, backgroundColor: "#fde047", padding: "2px 18px", borderRadius: 6 }}>
                paperwork.
              </span>
            </span>
          </div>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", fontSize: 24, fontWeight: 500, color: "#475569" }}>
            <span>Get it signed on a phone before</span>
            <span style={{ marginTop: 4 }}>they leave the counter.</span>
          </div>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              alignItems: "center",
              border: "2px solid #e2e8f0",
              color: "#334155",
              fontSize: 20,
              fontWeight: 600,
              padding: "12px 26px",
              borderRadius: 40,
              alignSelf: "flex-start",
            }}
          >
            Free to start · No credit card
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "center", position: "relative" }}>
          {/* Satori's renderer (ImageResponse), not the DOM -- no-img-element doesn't apply to route files like this one. */}
          <img src={docDataUri} width={docWidth} height={docHeight} alt="" style={{ borderRadius: 16 }} />
          <div
            style={{
              position: "absolute",
              bottom: -22,
              right: -6,
              display: "flex",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 5,
              boxShadow: "0 14px 28px -10px rgba(15, 23, 42, 0.3)",
            }}
          >
            <img src={phoneDataUri} width={phoneWidth} height={phoneHeight} alt="" style={{ borderRadius: 11 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
