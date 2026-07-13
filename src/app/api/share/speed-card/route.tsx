import { ImageResponse } from "next/og";
import { formatSpeedSeconds, MAX_PLAUSIBLE_SECONDS } from "@/lib/speed-stat";

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

  const time = formatSpeedSeconds(Math.round(seconds));

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
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 40 }}>
          SignedBy
        </div>
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: "10px -20px",
              backgroundColor: "#fde047",
              transform: "rotate(-1deg)",
              borderRadius: 8,
            }}
          />
          <div style={{ display: "flex", position: "relative", fontSize: 64, fontWeight: 800, color: "#0f172a", padding: "0 24px" }}>
            {time}
          </div>
        </div>
        {validPercentile != null && (
          <div style={{ display: "flex", fontSize: 32, color: "#334155", marginTop: 28 }}>
            Faster than {validPercentile}% of signers this month
          </div>
        )}
        <div style={{ display: "flex", fontSize: 22, color: "#94a3b8", marginTop: 48 }}>signedby.ai</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
