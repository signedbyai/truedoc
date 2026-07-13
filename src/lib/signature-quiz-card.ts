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

  // Wordmark, top-left.
  ctx.fillStyle = dark;
  ctx.font = "700 32px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SignedBy", 60, 76);

  // Archetype title, centered.
  ctx.textAlign = "center";
  ctx.font = "800 52px sans-serif";
  ctx.fillText(opts.archetype.title, width / 2, 180);

  // The signer's name, rendered in the matched signature style, with the
  // brand's rotated yellow-highlight treatment behind it (same motif as
  // opengraph-image.tsx and the speed-card route).
  const style = getSignatureStyle(opts.archetype.styleId);
  const prefix = style.italic ? "italic " : "";
  const nameText = opts.name.trim() || "Your Name";
  let fontSize = 84;
  ctx.font = `${prefix}800 ${fontSize}px ${style.fontFamily}`;
  const maxNameWidth = width - 240;
  while (fontSize > 32 && ctx.measureText(nameText).width > maxNameWidth) {
    fontSize -= 4;
    ctx.font = `${prefix}800 ${fontSize}px ${style.fontFamily}`;
  }
  const nameWidth = ctx.measureText(nameText).width;
  const nameY = 340;

  ctx.save();
  ctx.translate(width / 2, nameY);
  ctx.rotate((-1 * Math.PI) / 180);
  ctx.fillStyle = highlight;
  const padX = 36;
  const padY = fontSize * 0.42;
  ctx.fillRect(-nameWidth / 2 - padX, -padY, nameWidth + padX * 2, padY * 2);
  ctx.restore();

  ctx.fillStyle = dark;
  ctx.font = `${prefix}800 ${fontSize}px ${style.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillText(nameText, width / 2, nameY);

  // Tagline.
  ctx.fillStyle = gray;
  ctx.font = "500 28px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(opts.archetype.tagline, width / 2, 460, width - 160);

  // Footer.
  ctx.fillStyle = faint;
  ctx.font = "400 22px sans-serif";
  ctx.fillText("signedby.ai/quiz", width / 2, 560);

  return canvas.toDataURL("image/png");
}
