import { ImageResponse } from "next/og";

// Route-scoped, same pattern as /magic-quote and /templates' og images.
export const alt = "SignedBy API — REST API and webhooks for developers, included in the $29/mo Business plan.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function DevelopersOpengraphImage() {
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
          DEVELOPERS
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Build on SignedBy.
          </span>
          <span style={{ marginTop: 6, display: "flex", alignItems: "center", fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            <span
              style={{
                backgroundColor: "#fde047",
                padding: "4px 20px",
                borderRadius: 6,
              }}
            >
              Fast.
            </span>
          </span>
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", fontSize: 28, fontWeight: 500, color: "#475569" }}>
          <span>REST API + outbound webhooks for your CRM, app, or onboarding flow.</span>
          <span style={{ marginTop: 6 }}>Included in Business ($29/mo) — no separate developer plan.</span>
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
          REST API + Webhooks
        </div>
      </div>
    ),
    { ...size }
  );
}
