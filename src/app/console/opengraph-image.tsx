import { ImageResponse } from "next/og";

// Route-scoped, same pattern as /developers' og image.
export const alt = "SignedBy Console — use your favorite AI to send signing requests. Signing infra made for Europe.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ConsoleOpengraphImage() {
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
          CONSOLE
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 54, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5, lineHeight: 1.15 }}>
            Use your favorite AI to
          </span>
          <span style={{ marginTop: 4, display: "flex", alignItems: "center", fontSize: 54, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            send{" "}
            <span style={{ backgroundColor: "#fde047", padding: "2px 16px", borderRadius: 6, marginLeft: 14 }}>
              signing requests.
            </span>
          </span>
        </div>
        <div style={{ marginTop: 36, display: "flex", fontSize: 28, fontWeight: 500, color: "#475569" }}>
          Signing infra made for Europe.
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
          Pro plan+ · fully metered
        </div>
      </div>
    ),
    { ...size }
  );
}
