// Shared "type to sign" font library -- the actual styles a signer can pick
// from in src/components/signing-view.tsx, and also what powers the
// signature-personality quiz's result card (src/app/quiz/page.tsx). Pulled
// out into its own module specifically so those two things share one
// definition rather than the quiz inventing its own separate style list
// that could drift out of sync with what real signing actually offers.
//
// System-font stacks, deliberately not next/font/google webfonts -- keeps
// this free of any external font fetch (matches the zero-external-font-
// dependency choice already made for the rest of the app in layout.tsx)
// while still giving a handful of visually distinct handwriting-style
// options across platforms.
export type SignatureStyle = { id: string; label: string; fontFamily: string; italic?: boolean };

export const SIGNATURE_STYLES: SignatureStyle[] = [
  { id: "flowing", label: "Flowing", fontFamily: `"Segoe Script", "Bradley Hand", cursive` },
  { id: "elegant", label: "Elegant", fontFamily: `"Lucida Handwriting", "Brush Script MT", cursive` },
  { id: "casual", label: "Casual", fontFamily: `"Segoe Print", "Comic Sans MS", cursive` },
  { id: "classic", label: "Classic", fontFamily: `Georgia, "Times New Roman", serif`, italic: true },
];

export function getSignatureStyle(id: string): SignatureStyle {
  return SIGNATURE_STYLES.find((s) => s.id === id) ?? SIGNATURE_STYLES[0];
}

/**
 * Renders typed text in the chosen style to an offscreen canvas and returns
 * a PNG data URL. Used both for the real "type to sign" signature capture
 * (same output shape the draw pad produces, so nothing downstream --
 * caching, PDF baking -- needs to know which mode was used) and for the
 * quiz's shareable result card. Browser-only (canvas), so callers must be
 * client components.
 */
export function renderTypedSignature(
  text: string,
  style: { fontFamily: string; italic?: boolean },
  canvasSize: { width: number; height: number } = { width: 440, height: 160 }
): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const prefix = style.italic ? "italic " : "";
  const maxWidth = canvas.width - 48;
  let fontSize = Math.round(canvas.height * 0.35);
  while (fontSize > 18) {
    ctx.font = `${prefix}${fontSize}px ${style.fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  return canvas.toDataURL("image/png");
}
