import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { generateCertificateBadge, generateVerifiedBadgeImage } from "./badge-asset";

// Real rendering, not mocked — sharp/qrcode are pure/deterministic given the
// same input URL and the bundled mark asset (public/brand/verified-badge-mark-black.png),
// so this is worth checking end-to-end rather than stubbing the pipeline
// into meaninglessness. Asserts on decoded output dimensions (a real
// regression check that the SVG->PNG rasterization actually worked) rather
// than just "didn't throw."

describe("generateCertificateBadge", () => {
  it("produces a small PNG sized for the certificate page layout", async () => {
    const png = await generateCertificateBadge("https://signedby.ai/verify?hash=abc123");
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(130);
  });
});

describe("generateVerifiedBadgeImage", () => {
  it("produces the full standalone badge card", async () => {
    const png = await generateVerifiedBadgeImage("https://signedby.ai/verify?hash=abc123");
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(640);
    expect(meta.height).toBe(820);
  });

  it("produces different bytes for different verify URLs (the QR payload actually changes)", async () => {
    const a = await generateVerifiedBadgeImage("https://signedby.ai/verify?hash=aaaa");
    const b = await generateVerifiedBadgeImage("https://signedby.ai/verify?hash=bbbb");
    expect(Buffer.compare(a, b)).not.toBe(0);
  });
});
