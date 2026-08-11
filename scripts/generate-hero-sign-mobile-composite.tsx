import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Sign card's redesigned hero (2026-08-12, direct ask): "the mobile swipe to
// sign, either overlayed large on the right or animated in the sign
// section" -- overlay option chosen. Same compositional pattern as
// generate-hero-verified-badge-invoice-d.tsx (a primary artifact card, with
// a second real product surface stamped large over its edge), applied here
// with a phone-framed crop of the real hero-signer-mobile.png screenshot
// (the actual "Slide to sign & submit" screen) overlapping the ACTUAL
// desktop field editor screenshot (hero-field-editor.png).
//
// 2026-08-12, second pass, direct correction: "the desktop image of the
// field editor... I think that it's the wrong image." The first version of
// this script rebuilt a simplified/fabricated recreation of the field
// editor rather than compositing the real screenshot underneath the phone,
// reasoning that the phone would cover real content either way. That
// reasoning produced an image with details (missing the second signature
// block, no Saved/Documents/More chrome, an invented toolbar) that don't
// match the real product -- exactly the kind of drift Michael flagged.
// Fixed by using the real hero-field-editor.png directly as the full-bleed
// background and positioning the phone so it overlaps the screenshot's own
// blank canvas margin + the "Send for signature"/"Suggest fields" buttons
// on the right, NOT the two signature blocks near the bottom (those sit at
// roughly x:797-1110 of the 1562-wide original, safely left of the phone's
// left edge at x:1122) -- so the one thing this image is actually
// illustrating (mobile swipe-to-sign) stays paired with real, undistorted
// document content instead of a stand-in.

const WIDTH = 1642;
const HEIGHT = 1070;
const NAVY = "#0f172a";

async function main() {
  const editorBuf = await fs.readFile(path.join(process.cwd(), "public", "hero-field-editor.png"));
  const editorDataUri = `data:image/png;base64,${editorBuf.toString("base64")}`;
  const phoneBuf = await fs.readFile(path.join(process.cwd(), "public", "hero-signer-mobile.png"));
  const phoneDataUri = `data:image/png;base64,${phoneBuf.toString("base64")}`;

  // Real field-editor screenshot, actual size, no scaling.
  const EDITOR_WIDTH = 1562;
  const EDITOR_HEIGHT = 1070;

  // Real signer screenshot is 1236x2370 (aspect 0.5215) -- scaled to fit the
  // phone frame's inner screen at native aspect, no cropping needed.
  const PHONE_IMG_WIDTH = 500;
  const PHONE_IMG_HEIGHT = Math.round(PHONE_IMG_WIDTH * (2370 / 1236));
  const BEZEL = 10;
  const PHONE_FRAME_WIDTH = PHONE_IMG_WIDTH + BEZEL * 2;
  const PHONE_FRAME_HEIGHT = PHONE_IMG_HEIGHT + BEZEL * 2;

  // Phone's right edge sits flush with the canvas's right edge (a partial
  // hang past the real screenshot's own right edge, same "float past the
  // corner" language as the invoice/seal composite), left edge cuts 440px
  // into the screenshot's right side -- covers the Send/Suggest-fields
  // buttons and the empty page-canvas margin, not the signature blocks.
  const PHONE_X = WIDTH - PHONE_FRAME_WIDTH;
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
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori's renderer, not the DOM. */}
        <img
          src={editorDataUri}
          width={EDITOR_WIDTH}
          height={EDITOR_HEIGHT}
          alt=""
          style={{ position: "absolute", left: 0, top: 0 }}
        />

        {/* Phone frame -- real "Slide to sign & submit" screenshot, large,
            overlapping the real editor screenshot's right edge (2026-08-12,
            direct ask). */}
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
