// Pure geometry helper for the mobile "card" signing mode
// (components/signing-view.tsx). Given a field's normalized (0-1) rect on a
// page and that page's rendered pixel size, computes a zoomed-in crop
// centered on the field — expressed entirely as CSS percentages relative to
// a container with a fixed aspect ratio, so the caller can position an
// absolutely-positioned page image + a highlight box with pure CSS
// left/top/width/height percentages and get a responsive zoom with zero
// JS-measured pixel math or ResizeObserver.
//
// Kept framework-free and pure (no DOM/React) so it's easily unit-testable
// on its own — see card-crop.test.ts.

export type PageSize = { width: number; height: number };
export type FieldRect = { x: number; y: number; width: number; height: number };

export type CardCrop = {
  imgLeftPct: number;
  imgTopPct: number;
  imgWidthPct: number;
  imgHeightPct: number;
  fieldLeftPct: number;
  fieldTopPct: number;
  fieldWidthPct: number;
  fieldHeightPct: number;
};

const DEFAULT_ASPECT = 3 / 2; // crop container width:height
const DEFAULT_PAD_X_RATIO = 1.5; // extra horizontal context, as a multiple of field width
const DEFAULT_PAD_Y_RATIO = 3; // extra vertical context (room for a field label above/below)

export function computeCardCrop(
  field: FieldRect,
  page: PageSize,
  options?: { aspect?: number; paddingXRatio?: number; paddingYRatio?: number }
): CardCrop {
  const aspect = options?.aspect ?? DEFAULT_ASPECT;
  const padXRatio = options?.paddingXRatio ?? DEFAULT_PAD_X_RATIO;
  const padYRatio = options?.paddingYRatio ?? DEFAULT_PAD_Y_RATIO;

  const pageW = Math.max(page.width, 1);
  const pageH = Math.max(page.height, 1);

  const fieldPxX = field.x * pageW;
  const fieldPxY = field.y * pageH;
  const fieldPxW = Math.max(field.width * pageW, 1);
  const fieldPxH = Math.max(field.height * pageH, 1);

  const padX = fieldPxW * padXRatio;
  const padY = fieldPxH * padYRatio;

  let cropW = fieldPxW + padX * 2;
  let cropH = fieldPxH + padY * 2;

  // Force the crop rect to match the container's aspect ratio exactly, so
  // the caller never needs to letterbox — expand whichever axis is
  // relatively too small rather than cropping either axis down (cropping
  // down could clip the field itself on an extreme aspect mismatch).
  if (cropW / cropH > aspect) {
    cropH = cropW / aspect;
  } else {
    cropW = cropH * aspect;
  }

  // Clamp to the page itself (can't crop outside the rendered page).
  cropW = Math.min(cropW, pageW);
  cropH = Math.min(cropH, pageH);

  let cropX = fieldPxX + fieldPxW / 2 - cropW / 2;
  let cropY = fieldPxY + fieldPxH / 2 - cropH / 2;
  cropX = Math.min(Math.max(cropX, 0), Math.max(pageW - cropW, 0));
  cropY = Math.min(Math.max(cropY, 0), Math.max(pageH - cropH, 0));

  return {
    imgLeftPct: (-cropX / cropW) * 100,
    imgTopPct: (-cropY / cropH) * 100,
    imgWidthPct: (pageW / cropW) * 100,
    imgHeightPct: (pageH / cropH) * 100,
    fieldLeftPct: ((fieldPxX - cropX) / cropW) * 100,
    fieldTopPct: ((fieldPxY - cropY) / cropH) * 100,
    fieldWidthPct: (fieldPxW / cropW) * 100,
    fieldHeightPct: (fieldPxH / cropH) * 100,
  };
}
