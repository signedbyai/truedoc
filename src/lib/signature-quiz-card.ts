import type { Archetype } from "./signature-quiz";
import { getSignatureStyle } from "./signature-styles";

// Renders the quiz's shareable result card entirely client-side, on an
// offscreen <canvas> -- deliberately NOT a server route (unlike
// /api/share/speed-card, which needs next/og's ImageResponse because it
// needs a shareable link that works before the recipient has any client
// state). The quiz already has everything it needs in the browser, and
// critically: next/og's Satori renderer can't use arbitrary system fonts
// like "Segoe Script" the way a real browser canvas can, so rendering this
// server-side would mean the card's font wouldn't actually match what
// SIGNATURE_STYLES produces for real signing. Doing it client-side, reusing
// the literal SIGNATURE_STYLES font stacks, keeps the card visually
// identical to what your name would actually look like typed into a real
// signature field.
export function renderQuizResultCard(opts: { name: string; archetype: Archetype }): string {
  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const dark = "#0f172a";
  const gray = "#334155";
  const faint = "#94a3b8";
  const highlight = "#fde047";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";

  // Archetype title gets the rotated yellow-highlight treatment -- same
  // motif as the homepage headline (src/app/page.tsx), opengraph-image.tsx,
  // and /api/share/speed-card's "Document signed." -- this is the hook, so
  // it reads first, bigger and bolder than anything else on the card.
  const titleFontSize = 60;
  ctx.font = `800 ${titleFontSize}px sans-serif`;
  const titleText = opts.archetype.title;
  const titleWidth = ctx.measureText(titleText).width;
  const titleY = 150;
  ctx.save();
  ctx.translate(width / 2, titleY);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.fillStyle = highlight;
  const titlePadX = 32;
  const titleBoxHeight = titleFontSize * 1.3;
  ctx.fillRect(-titleWidth / 2 - titlePadX, -titleBoxHeight / 2, titleWidth + titlePadX * 2, titleBoxHeight);
  ctx.fillStyle = dark;
  ctx.textBaseline = "middle";
  ctx.fillText(titleText, 0, 0);
  ctx.restore();

  // The signer's name, rendered in the matched signature style -- the part
  // that ties this card back to the same font library real signing uses.
  const style = getSignatureStyle(opts.archetype.styleId);
  const prefix = style.italic ? "italic " : "";
  const nameText = opts.name.trim() || "Your Name";
  let fontSize = 72;
  ctx.font = `${prefix}800 ${fontSize}px ${style.fontFamily}`;
  const maxNameWidth = width - 240;
  while (fontSize > 32 && ctx.measureText(nameText).width > maxNameWidth) {
    fontSize -= 4;
    ctx.font = `${prefix}800 ${fontSize}px ${style.fontFamily}`;
  }
  ctx.fillStyle = dark;
  ctx.textBaseline = "middle";
  ctx.fillText(nameText, width / 2, 320);

  // Tagline.
  ctx.fillStyle = gray;
  ctx.font = "500 28px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(opts.archetype.tagline, width / 2, 450, width - 160);

  // Footer -- matches the speed card's footer copy (/api/share/speed-card).
  ctx.fillStyle = faint;
  ctx.font = "400 22px sans-serif";
  ctx.fillText("Start for free at signedby.ai", width / 2, 560);

  return canvas.toDataURL("image/png");
}
