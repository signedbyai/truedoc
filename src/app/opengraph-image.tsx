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
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 104, fontWeight: 700, color: "#0f172a", letterSpacing: -2 }}>
            SignedBy
          </span>
          <span style={{ fontSize: 30, fontWeight: 600, color: "#94a3b8" }}>BETA</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: "#475569", display: "flex" }}>
          E-signatures, without the per-seat tax.
        </div>
        <div
          style={{
            marginTop: 44,
            width: 140,
            height: 7,
            backgroundColor: "#2563eb",
            borderRadius: 4,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
