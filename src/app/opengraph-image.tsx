import { ImageResponse } from "next/og";

// Auto-wired by Next.js into both og:image and twitter:image meta tags for
// every page under this layout (metadata.twitter.card is set in layout.tsx).
export const alt = "SignedBy — e-signatures without the per-seat tax";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
        }}
      >
        {/* Centering is based on "SignedBy" alone — BETA is absolutely
            positioned off the top-right corner so it doesn't pull the
            wordmark off-center. The default OG font only ships normal/bold
            weights, so fontWeight above 700 has no effect. Faux-bold via a
            2x2 stack of offset duplicates (the classic "poor man's bold"
            trick) — the website's own header logo is font-semibold (600),
            but at hero scale for a share card it needs to read heavier than
            that, so this pushes past what the real font file supports. */}
        <div style={{ position: "relative", display: "flex" }}>
          <span style={{ fontSize: 104, fontWeight: 700, color: "#0f172a", letterSpacing: -2 }}>
            SignedBy
          </span>
          {[
            [1, 0],
            [0, 1],
            [1, 1],
            [2, 1],
            [1, 2],
            [2, 2],
          ].map(([left, top]) => (
            <span
              key={`${left}-${top}`}
              style={{
                position: "absolute",
                top,
                left,
                fontSize: 104,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: -2,
              }}
            >
              SignedBy
            </span>
          ))}
          <span
            style={{
              position: "absolute",
              left: "100%",
              top: 12,
              marginLeft: 12,
              fontSize: 28,
              fontWeight: 700,
              color: "#94a3b8",
              whiteSpace: "nowrap",
            }}
          >
            BETA
          </span>
        </div>
        <div style={{ marginTop: 30, fontSize: 46, fontWeight: 600, color: "#1e293b", display: "flex" }}>
          E-signatures, without the per-seat tax.
        </div>
        <div style={{ marginTop: 34, display: "flex" }}>
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#0f172a",
              backgroundColor: "#fde047",
              padding: "6px 20px",
              borderRadius: 6,
              transform: "rotate(-1.5deg)",
            }}
          >
            Sign documents.
          </span>
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            fontSize: 30,
            fontWeight: 600,
            padding: "18px 44px",
            borderRadius: 10,
          }}
        >
          Start for free
        </div>
      </div>
    ),
    { ...size }
  );
}
