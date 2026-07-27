import { ImageResponse } from "next/og";

// Route-scoped, same pattern as the parent /magic-quote/opengraph-image.tsx
// (and /ai-drafter, /quiz) — this page now gets its own localized card
// instead of inheriting the generic Magic Quote one, added 2026-07-27 once
// the AU tradies page was ready to promote on social.
export const alt = "Magic Quote for Australian tradies — say the job, get a proper quote, GST and all. SignedBy.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MagicQuoteAuTradiesOpengraphImage() {
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
          MAGIC QUOTE FOR AU TRADIES
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Say the job.
          </span>
          <span
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              fontSize: 64,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: -1.5,
            }}
          >
            Get a proper{" "}
            <span
              style={{
                marginLeft: 18,
                backgroundColor: "#fde047",
                padding: "4px 20px",
                borderRadius: 6,
              }}
            >
              quote.
            </span>
          </span>
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            fontSize: 28,
            fontWeight: 500,
            color: "#475569",
          }}
        >
          <span>GST and all — editable line items, real math.</span>
          <span style={{ marginTop: 6 }}>Free. No job-management subscription.</span>
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
