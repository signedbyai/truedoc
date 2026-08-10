// Geometry for the Badge Placer (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md
// V1.1) — a sibling to field-resize.ts, deliberately NOT reusing its
// resizeField/MIN_FIELD_W/MIN_FIELD_H. Two real differences from an
// ordinary signer field:
//
// 1. The badge is a fixed-aspect-ratio PNG (mark + QR + two lines of text,
//    300x130 — see badge-asset.tsx's generateCertificateBadge), so
//    independently dragging one corner the way resizeField does would
//    stretch it — a stretched QR isn't just ugly, non-square modules can
//    genuinely fail to scan. Only WIDTH is ever stored
//    (documents.badge_width); height is always derived from BADGE_ASPECT at
//    draw time, so resize is single-dimension by construction — there is no
//    independent-corner drag to guard against here at all.
// 2. MIN_FIELD_W/H are sized for the smallest existing field type (a
//    checkbox) — real protection against a box collapsing to nothing, not
//    protection against a phone camera being unable to resolve a QR.
//    MIN_BADGE_W below is reasoned from generateCertificateBadge's own
//    calibration (QR occupies 100/300 of the badge's width, and that badge
//    ships today at 210pt/~0.97in wide on the certificate page — already
//    close to the practical floor for a phone-camera QR scan). Not yet
//    print-and-scan tested at the exact floor; flagged in
//    IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md as worth confirming, not
//    hardcoded as gospel.

// Height/width ratio of the compact badge PNG (generateCertificateBadge is
// 300x130). Applied to whatever width is chosen, at whatever page the badge
// ends up on — the page itself may not be the same aspect ratio as the
// badge, so this is purely "how tall is the badge image," not a page-shape
// conversion.
export const BADGE_ASPECT = 130 / 300;

// ~1.5in on a US Letter page (612pt wide) — comfortably above the ~0.97in
// the existing certificate-page badge already ships at, itself close to a
// QR's practical phone-scan floor. Hard clamp; resize can't go below this.
export const MIN_BADGE_W = 0.15;
// ~1.9in on Letter — below this, still allowed, but resizeBadge callers
// should show the soft "may be too small to scan reliably" warning
// (domainWarnings pattern in field-editor.tsx), not a hard block.
export const BADGE_SOFT_WARNING_W = 0.18;
// ~3.5in on Letter — plenty large for a corner stamp; keeps a careless drag
// from covering half an invoice.
export const MAX_BADGE_W = 0.42;
// Default width if the user never resizes — meaningfully above the soft
// warning floor, small enough to read as a corner mark, not a headline.
export const DEFAULT_BADGE_W = 0.22;
// Bottom-right/page-1 margin fallback for an org that's never saved a
// position (V1.4's "hardcoded fallback" case).
export const FALLBACK_MARGIN = 0.04;

export type BadgeRect = { page: number; x: number; y: number; width: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Bottom-right, page 1, at the default size — used only when an org has
 *  genuinely never saved a badge position before (V1.4's fallback tier). */
export function fallbackBadgeRect(): BadgeRect {
  return {
    page: 1,
    x: 1 - FALLBACK_MARGIN - DEFAULT_BADGE_W,
    y: 1 - FALLBACK_MARGIN - DEFAULT_BADGE_W * BADGE_ASPECT,
    width: DEFAULT_BADGE_W,
  };
}

/** One fixed corner keyword, reusing V2.1's own preset vocabulary
 *  (bottom-right / bottom-left / top-right / top-left) rather than
 *  inventing a second one for the mobile UI. Snaps a badge of the given
 *  width to that corner of the given page, same margin as the fallback. */
export type BadgeCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export function cornerBadgeRect(corner: BadgeCorner, page: number, width: number): BadgeRect {
  const height = width * BADGE_ASPECT;
  const left = corner === "bottom-left" || corner === "top-left";
  const top = corner === "top-left" || corner === "top-right";
  return {
    page,
    x: left ? FALLBACK_MARGIN : 1 - FALLBACK_MARGIN - width,
    y: top ? FALLBACK_MARGIN : 1 - FALLBACK_MARGIN - height,
    width,
  };
}

/** Which corner an arbitrary rect is closest to — used when a position
 *  saved from a freeform desktop drag needs to be represented on the
 *  mobile corner-tap UI (V1.1: "whichever interaction last wrote the
 *  columns, the other one just reads x/y/width back and maps it onto its
 *  own UI as best it can"). Pure nearest-corner-by-center test. */
export function nearestCorner(rect: BadgeRect): BadgeCorner {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + (rect.width * BADGE_ASPECT) / 2;
  const left = cx < 0.5;
  const top = cy < 0.5;
  return top ? (left ? "top-left" : "top-right") : left ? "bottom-left" : "bottom-right";
}

/** Desktop resize: a single bottom-right-style handle scales width off one
 *  drag axis (the larger of dx/dy, so a diagonal drag feels natural) —
 *  height always follows BADGE_ASPECT, never dragged independently. The
 *  opposite corner (top-left, in document space — not necessarily the
 *  visual corner the handle sits on if the badge is anchored elsewhere)
 *  stays fixed, same "anchor doesn't move" feel as resizeField. */
export function resizeBadge(opts: { orig: BadgeRect; dx: number; dy: number }): BadgeRect {
  const { orig, dx, dy } = opts;
  // Prefer whichever axis moved further — a mostly-horizontal drag reads by
  // its horizontal delta, a mostly-vertical one by its vertical delta
  // (converted back to a width-equivalent via BADGE_ASPECT).
  const widthDelta = Math.abs(dx) >= Math.abs(dy) ? dx : dy / BADGE_ASPECT;
  const width = clamp(orig.width + widthDelta, MIN_BADGE_W, MAX_BADGE_W);
  const height = width * BADGE_ASPECT;
  return {
    page: orig.page,
    x: clamp(orig.x, 0, 1 - width),
    y: clamp(orig.y, 0, 1 - height),
    width,
  };
}

/** Mobile slider: sets width directly (already single-dimension by the
 *  control itself), re-anchored to whichever corner the badge is
 *  currently snapped to so growing/shrinking doesn't drift it off the
 *  page edge it's pinned to. */
export function sliderResizeBadge(orig: BadgeRect, width: number): BadgeRect {
  const clampedWidth = clamp(width, MIN_BADGE_W, MAX_BADGE_W);
  return cornerBadgeRect(nearestCorner(orig), orig.page, clampedWidth);
}
