// Pure geometry helpers for placing signature/date/text fields on a PDF
// page, normalized to 0-1 page-fraction coordinates. Extracted out of
// field-editor.tsx so the collision logic can be unit tested without
// mounting the whole editor.

export type Rect = { x: number; y: number; width: number; height: number };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Anything with page/position/size — a real Field or a lightweight test fixture. */
export type Placed = Rect & { page: number };

// Two fields silently stacking on top of each other used to be possible —
// the bottom one becomes invisible and, if required, gives the signer no
// way to find or fill it. Instead of allowing that, nudge a new/moved field
// down-and-across in small steps until it no longer overlaps anything else
// on the same page. Gives up gracefully (keeps the requested spot) if the
// page is too crowded to find a free spot within a reasonable number of tries.
export function findFreePosition<T extends Placed>(
  page: number,
  x: number,
  y: number,
  width: number,
  height: number,
  existing: T[]
): { x: number; y: number } {
  const onSamePage = existing.filter((f) => f.page === page);
  let candidate = { x, y };
  const step = 0.03;

  for (let attempt = 0; attempt < 40; attempt++) {
    const collides = onSamePage.some((f) => rectsOverlap({ ...candidate, width, height }, f));
    if (!collides) return candidate;
    candidate = {
      x: Math.min(Math.max(candidate.x + (attempt % 2 === 0 ? step : 0), 0), 1 - width),
      y: Math.min(Math.max(candidate.y + step, 0), 1 - height),
    };
  }
  return candidate;
}
