import { ImageResponse } from "next/og";
import { TEMPLATE_PAGES } from "@/lib/template-pages";

// Route-scoped, same pattern as /ai-drafter and /magic-quote's og images.
// Covers the /templates index specifically -- each /templates/[slug] page
// has its own dynamic version in that segment's opengraph-image.tsx.
export const alt = "Free document templates — freelance agreements, NDAs, waivers & more. SignedBy.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TemplatesOpengraphImage() {
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
          FREE TEMPLATES
        </div>
        <div style={{ marginTop: 20, display: "flex" }}>
          <span style={{ fontSize: 60, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            Real agreements,
          </span>
        </div>
        <div style={{ marginTop: 6, display: "flex" }}>
          <span style={{ fontSize: 60, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>
            ready to{" "}
            <span style={{ backgroundColor: "#fde047", padding: "4px 20px", borderRadius: 6 }}>
              use today.
            </span>
          </span>
        </div>
        <div style={{ marginTop: 40, fontSize: 28, fontWeight: 500, color: "#475569", display: "flex" }}>
          Freelance agreements, NDAs, waivers, and more — copy free, or customize with AI.
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
          {TEMPLATE_PAGES.length} free templates, ready to use
        </div>
      </div>
    ),
    { ...size }
  );
}
