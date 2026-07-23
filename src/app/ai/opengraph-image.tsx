import { ImageResponse } from "next/og";

// Route-scoped, same pattern as /magic-quote/opengraph-image.tsx and
// /quiz/opengraph-image.tsx.
export const alt = "SignedBy AI — send contracts from a prompt. Coming soon, Business plan.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SignedByAiOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#fde047" }}>
          COMING SOON · BUSINESS PLAN
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 64, fontWeight: 800, color: "#f8fafc", letterSpacing: -1.5 }}>
            Send contracts from a
          </span>
          <span
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              fontSize: 64,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            <span style={{ backgroundColor: "#fde047", padding: "4px 20px", borderRadius: 6 }}>prompt.</span>
          </span>
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", fontSize: 28, fontWeight: 500, color: "#cbd5e1" }}>
          <span>Control SignedBy from Claude, ChatGPT, or Mistral.</span>
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            border: "2px solid rgba(255,255,255,0.15)",
            color: "#e2e8f0",
            fontSize: 24,
            fontWeight: 600,
            padding: "16px 32px",
            borderRadius: 40,
            alignSelf: "flex-start",
          }}
        >
          signedby.ai/ai
        </div>
      </div>
    ),
    { ...size }
  );
}
