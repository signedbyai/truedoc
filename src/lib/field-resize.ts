// Geometry for dragging a field's corner handle to resize it. Pure + unit
// tested, kept out of field-editor.tsx (which just wires pointer events to
// it) — same split as card-crop.ts / suggestion-binding.ts. All values are in
// the editor's normalized 0-1 page space (see field-types.ts defaults); the
// smallest default field is the checkbox at 0.03 x 0.03, so the minimums sit
// just under that.

export const MIN_FIELD_W = 0.02;
export const MIN_FIELD_H = 0.015;

export type ResizeCorner = { left: boolean; top: boolean };
export type Rect = { x: number; y: number; width: number; height: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Resize a field by dragging one corner. The opposite corner stays anchored;
 * the dragged corner follows the pointer (clamped to the page), with a
 * minimum size enforced by keeping the dragged corner at least MIN away from
 * the anchor. Returns the new normalized rect.
 */
export function resizeField(opts: { corner: ResizeCorner; orig: Rect; dx: number; dy: number }): Rect {
  const { corner, orig, dx, dy } = opts;

  // The anchor is the corner opposite the one being dragged — it never moves.
  const ax = corner.left ? orig.x + orig.width : orig.x;
  const ay = corner.top ? orig.y + orig.height : orig.y;

  // The dragged corner follows the pointer, but must stay on its own side of
  // the anchor and at least MIN away from it — so the field never flips
  // inside-out or collapses to nothing. Then clamp to the page edges.
  let mx = (corner.left ? orig.x : orig.x + orig.width) + dx;
  let my = (corner.top ? orig.y : orig.y + orig.height) + dy;
  mx = corner.left ? Math.min(mx, ax - MIN_FIELD_W) : Math.max(mx, ax + MIN_FIELD_W);
  my = corner.top ? Math.min(my, ay - MIN_FIELD_H) : Math.max(my, ay + MIN_FIELD_H);
  mx = clamp(mx, 0, 1);
  my = clamp(my, 0, 1);

  return {
    x: Math.min(ax, mx),
    y: Math.min(ay, my),
    width: Math.abs(ax - mx),
    height: Math.abs(ay - my),
  };
}
