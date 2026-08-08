import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Pitch-deck asset for the new "Capabilities" slide (direct ask, 2026-08-08):
// renders the two real confirmation popovers from
// src/components/send-seal-transition.tsx side by side (Sent w/ paper-plane
// on the left, Sealed w/ shield on the right) exactly as that component
// styles them -- same colors, spacing, copy ("Sent"/"Sealed", "Opening the
// document"), just without the fixed-position dimmed backdrop, since here
// they're laid out inline rather than as a real overlay. This is a
// recreation of a real, shipped UI element (not an invented mockup) -- the
// deck slide should caption it that way.

const WIDTH = 1400;
const HEIGHT = 620;

// Base64 data URIs, not file:// paths -- matches every other local-image
// loader in this repo (badge-asset.tsx's loadMarkDataUri,
// opengraph-image.tsx's loadDataUri), the pattern already proven to work
// with Satori/ImageResponse both inside real Next.js routes and in these
// standalone tsx generator scripts.
async function loadDataUri(filename: string): Promise<string> {
  const buf = await fs.readFile(path.join(process.cwd(), "public", "deck-icons", filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function PopoverCard({ kind, iconDataUri }: { kind: "sent" | "sealed"; iconDataUri: string }) {
  const isSealed = kind === "sealed";
  const label = isSealed ? "Sealed" : "Sent";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        borderRadius: 24,
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        padding: "56px 72px",
        boxShadow: "0 20px 45px -12px rgba(15, 23, 42, 0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 96,
          height: 96,
          borderRadius: 999,
          backgroundColor: isSealed ? "#ecfdf5" : "#eff6ff",
          color: isSealed ? "#047857" : "#1d4ed8",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
        <img src={iconDataUri} width={48} height={48} alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#0f172a" }}>{label}</div>
        <div style={{ marginTop: 4, display: "flex", fontSize: 18, color: "#64748b" }}>Opening the document</div>
      </div>
    </div>
  );
}

async function main() {
  const [sentIcon, sealedIcon] = await Promise.all([
    loadDataUri("Send-blue.png"),
    loadDataUri("ShieldCheck-emerald.png"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 90,
          backgroundColor: "#f1f5f9",
        }}
      >
        <PopoverCard kind="sent" iconDataUri={sentIcon} />
        <PopoverCard kind="sealed" iconDataUri={sealedIcon} />
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function run() {
  const res = await main();
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-send-seal-popovers.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
