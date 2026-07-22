import { ImageResponse } from "next/og";

// Route-scoped, same pattern as /ai-drafter/opengraph-image.tsx and
// /quiz/opengraph-image.tsx. Layout/copy mirrors the LinkedIn ad creative
// (marketing/linkedin-ads/magic-quote-ad.svg) for consistency across the
// campaign.
export const alt = "Magic Quote — describe the job, get a line-item price quote. SignedBy.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MagicQuoteOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#94a3b8" }}>
          MAGIC QUOTE
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Describe the job.
          </span>
          <span style={{ marginTop: 6, display: "flex", alignItems: "center", fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Get a real{" "}
            <span
              style={{
                marginLeft: 18,
                backgroundColor: "#fde047",
                padding: "4px 20px",
                borderRadius: 6,
              }}
            >
              price quote.
            </span>
          </span>
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", fontSize: 28, fontWeight: 500, color: "#475569" }}>
          <span>Editable line items, real math, done in seconds.</span>
          <span style={{ marginTop: 6 }}>On every plan, including Free.</span>
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            border: "2px solid #e2e8f0",
            color: "#334155",
            fontSize: 24,
            fontWeight: 600,
            padding: "16px 32px",
            borderRadius: 40,
            alignSelf: "flex-start",
          }}
        >
          Math done by code, not AI
        </div>
      </div>
    ),
    { ...size }
  );
}
