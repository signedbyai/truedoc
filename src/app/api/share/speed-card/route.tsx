import { ImageResponse } from "next/og";
import { speedStatCardLine, MAX_PLAUSIBLE_SECONDS } from "@/lib/speed-stat";

// Renders the shareable "you signed this in X seconds" card shown on the
// signing-complete screen (src/components/signing-view.tsx). Pure render --
// takes the already-computed, already-gated numbers as query params rather
// than looking anything up itself, same trust model as any dynamic OG
// image: nothing here is sensitive (no document/signer identity), so no
// auth/token is needed, and there's nothing to look up wrong.
export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seconds = Number(searchParams.get("seconds"));
  const percentileRaw = searchParams.get("percentile");
  const percentile = percentileRaw != null ? Number(percentileRaw) : null;

  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_PLAUSIBLE_SECONDS) {
    return new Response("Invalid seconds", { status: 400 });
  }
  const validPercentile =
    percentile != null && Number.isFinite(percentile) && percentile >= 0 && percentile <= 100
      ? Math.round(percentile)
      : null;

  const cardLine = speedStatCardLine({ seconds: Math.round(seconds), percentile: validPercentile });

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
            (src/app/page.tsx) and opengraph-image.tsx -- the hook, not a
            small wordmark, is what should read first on this card. */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#fde047",
            color: "#0f172a",
            fontSize: 72,
            fontWeight: 800,
            padding: "8px 28px",
            borderRadius: 8,
            transform: "rotate(-2deg)",
          }}
        >
          Document signed.
        </div>
        <div
          style={{
            display: "flex",
            color: "#0f172a",
            fontSize: 44,
            fontWeight: 800,
            textAlign: "center",
            maxWidth: 950,
            marginTop: 48,
            lineHeight: 1.3,
          }}
        >
          {cardLine}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#94a3b8", marginTop: 56 }}>
          Start for free at signedby.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
