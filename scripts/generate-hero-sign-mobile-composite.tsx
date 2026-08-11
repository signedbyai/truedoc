import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Sign card's redesigned hero (2026-08-12, direct ask): "the mobile swipe to
// sign, either overlayed large on the right or animated in the sign
// section" -- overlay option chosen. Same compositional pattern as
// generate-hero-verified-badge-invoice-d.tsx (a primary artifact card, with
// a second real product surface stamped large over its edge), applied here
// with a phone-framed crop of the real hero-signer-mobile.png screenshot
// (the actual "Slide to sign & submit" screen) overlapping a simplified
// recreation of the real desktop field editor (hero-field-editor.png's own
// layout/copy -- SignedBy header, doc title, Send for signature, the
// Signature/Initials/Date/Text/Checkbox toolbar, recipient chips, and the
// two signature blocks at the bottom of the document canvas). Rebuilt
// rather than pasting the flat screenshot underneath the phone because the
// real screenshot's important content (buttons, recipient chips) sits right
// where the phone needs to overlap -- same reasoning generate-hero-ai-draft
// used for building fresh rather than compositing over a captured shot.

const WIDTH = 1460;
const HEIGHT = 1080;
const NAVY = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const YELLOW = "#fde047";

async function main() {
  const phoneBuf = await fs.readFile(path.join(process.cwd(), "public", "hero-signer-mobile.png"));
  const phoneDataUri = `data:image/png;base64,${phoneBuf.toString("base64")}`;

  // Real screenshot is 1236x2370 (aspect 0.5215) -- scaled to fit the phone
  // frame's inner screen at native aspect, no cropping needed.
  const PHONE_IMG_WIDTH = 500;
  const PHONE_IMG_HEIGHT = Math.round(PHONE_IMG_WIDTH * (2370 / 1236));
  const BEZEL = 10;
  const PHONE_FRAME_WIDTH = PHONE_IMG_WIDTH + BEZEL * 2;
  const PHONE_FRAME_HEIGHT = PHONE_IMG_HEIGHT + BEZEL * 2;

  const CARD_X = 40;
  const CARD_Y = 40;
  const CARD_WIDTH = 980;
  const CARD_HEIGHT = HEIGHT - CARD_Y * 2;

  const PHONE_X = 900;
  const PHONE_Y = Math.round((HEIGHT - PHONE_FRAME_HEIGHT) / 2);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          backgroundColor: "#f8fafc",
          position: "relative",
        }}
      >
        {/* Desktop field-editor card -- simplified recreation of
            hero-field-editor.png's real layout/copy. */}
        <div
          style={{
            position: "absolute",
            left: CARD_X,
            top: CARD_Y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 20px 45px -20px rgba(15, 23, 42, 0.25)",
            padding: "28px 32px",
          }}
        >
          {/* Top bar: wordmark + doc title + Send button */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: NAVY }}>SignedBy</div>
              <div style={{ display: "flex", fontSize: 16, color: MUTED }}>Demo_Consulting_Agreement</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: YELLOW,
                color: NAVY,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                padding: "10px 20px",
              }}
            >
              Send for signature →
            </div>
          </div>

          {/* Field toolbar */}
          <div style={{ marginTop: 22, display: "flex", flexDirection: "row", gap: 10 }}>
            {["Signature", "Initials", "Date", "Text", "Checkbox"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: SLATE,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Recipient chips */}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: SLATE }}>Recipients:</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #bfdbfe",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, backgroundColor: "#3b82f6" }} />
              Amara Okafor
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #ddd6fe",
                backgroundColor: "#f5f3ff",
                color: "#6d28d9",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, backgroundColor: "#8b5cf6" }} />
              Daniel Vos
            </div>
          </div>

          {/* Document canvas */}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#f8fafc",
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 17, fontWeight: 700, color: NAVY }}>4. Confidentiality</div>
            <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: SLATE, lineHeight: 1.5 }}>
              Each party will keep the other&apos;s confidential information private during the term and for two
              years after it ends.
            </div>
            <div style={{ marginTop: 20, display: "flex", fontSize: 17, fontWeight: 700, color: NAVY }}>5. Governing law</div>
            <div style={{ marginTop: 6, display: "flex", fontSize: 14, color: SLATE, lineHeight: 1.5 }}>
              This Agreement is governed by the laws of the Netherlands.
            </div>

            <div style={{ display: "flex", flex: 1 }} />

            <div style={{ display: "flex", flexDirection: "row", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: NAVY }}>For the Client:</div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    border: "2px solid #93c5fd",
                    backgroundColor: "#eff6ff",
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: "#1d4ed8" }}>Amara Okafor</div>
                  <div style={{ display: "flex", fontSize: 12, color: "#3b82f6" }}>Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phone frame -- real "Slide to sign & submit" screenshot, large,
            overlapping the card's right edge (2026-08-12, direct ask). */}
        <div
          style={{
            position: "absolute",
            left: PHONE_X,
            top: PHONE_Y,
            width: PHONE_FRAME_WIDTH,
            height: PHONE_FRAME_HEIGHT,
            display: "flex",
            backgroundColor: NAVY,
            borderRadius: 44,
            padding: BEZEL,
            boxShadow: "0 30px 60px -18px rgba(15, 23, 42, 0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: PHONE_IMG_WIDTH,
              height: PHONE_IMG_HEIGHT,
              borderRadius: 34,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
            <img src={phoneDataUri} width={PHONE_IMG_WIDTH} height={PHONE_IMG_HEIGHT} alt="" />
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  return image;
}

async function run() {
  const res = await main();
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(process.cwd(), "public", "hero-sign-mobile-composite.png");
  await fs.writeFile(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

run();
