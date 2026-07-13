import { ImageResponse } from "next/og";

// Route-scoped (colocated with page.tsx in this same segment), so Next.js
// merges this in automatically for /quiz specifically -- see the comment
// on that page's metadata export for why that's different from
// /vs/signnow and /vs/docusign, which don't have their own image file and
// so have to point back at the root layout's opengraph-image.tsx by hand.
export const alt = "What does your signature say about you? — a signature-personality quiz from SignedBy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function QuizOpengraphImage() {
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
          fontFamily: "sans-serif",
          padding: "0 90px",
        }}
      >
        {/* Same rotated yellow-highlight treatment as the homepage headline
            and the speed-stat/quiz result cards -- the hook reads first. */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#fde047",
            color: "#0f172a",
            fontSize: 46,
            fontWeight: 800,
            padding: "10px 28px",
            borderRadius: 8,
            transform: "rotate(-2deg)",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          What does your signature say about you?
        </div>
        <div style={{ display: "flex", color: "#334155", fontSize: 30, fontWeight: 500, marginTop: 44 }}>
          8 quick questions. No email required.
        </div>
        <div style={{ display: "flex", color: "#94a3b8", fontSize: 24, marginTop: 56 }}>signedby.ai/quiz</div>
      </div>
    ),
    { ...size }
  );
}
