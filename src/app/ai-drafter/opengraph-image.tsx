import { ImageResponse } from "next/og";

// Route-scoped (colocated with page.tsx in this same segment), same pattern
// as /quiz/opengraph-image.tsx -- Next.js merges this in automatically for
// /ai-drafter specifically, instead of falling back to the generic root
// opengraph-image.tsx (homepage messaging), which is what this page's
// metadata.openGraph pointed at until now. Layout/copy mirrors the LinkedIn
// ad creative (marketing/linkedin-ads/ai-drafter-ad.svg) for consistency
// across the campaign -- same headline, same "not offered by
// DocuSign/SignNow" proof point.
export const alt = "AI Drafter — describe a contract, get a real first draft. SignedBy.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function AiDrafterOpengraphImage() {
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
          AI DRAFTER
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Describe the contract.
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
              draft back.
            </span>
          </span>
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", fontSize: 28, fontWeight: 500, color: "#475569" }}>
          <span>Freelance agreements, NDAs, waivers &amp; more.</span>
          <span style={{ marginTop: 6 }}>7 languages. Included on Pro, $7/mo.</span>
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
          Not offered by DocuSign or SignNow
        </div>
      </div>
    ),
    { ...size }
  );
}
