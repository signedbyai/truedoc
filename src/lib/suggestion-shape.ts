// Signature-block "shape descriptor" for FIELD_SUGGESTION_LEARNING_SCOPE.md's
// Phase 1 logging. Derived entirely from suggested-field coordinates and the
// AI's own party count -- never from document text -- so later analysis can
// group "documents like this one" without storing what the document said.
//
// Computed from the AI's ORIGINAL suggested signature-type fields (not
// wherever the sender ends up moving them), since the goal is to describe
// the document's actual layout, independent of any correction being logged
// alongside it.

export type SignatureLayout = "single_party" | "stacked_blocks" | "side_by_side_columns" | "unknown";

export type SignatureFieldGeom = { page: number; x: number; y: number; role: number | null };

// Same band if within this y-fraction of each other (~5% of page height).
const Y_BAND = 0.05;
// Counts as a real horizontal gap, not just noise, at this x-fraction apart
// (~15% of page width) -- this is the exact geometric pattern behind the
// two-column suggest-fields bug fixed 2026-07-26 (placeCandidates()'s
// x-center-vs-left-edge mixup), worth naming as its own category from day
// one since it's already the most likely thing to special-case later.
const X_GAP = 0.15;

export function computeSignatureLayout(
  signatureFields: SignatureFieldGeom[],
  partyCount: number
): { layout: SignatureLayout; columnCount: number | null } {
  if (partyCount <= 0) return { layout: "unknown", columnCount: null };
  if (partyCount === 1) return { layout: "single_party", columnCount: null };

  // Group by role (party index); a field with no role tag can't be
  // attributed to a specific party for this descriptor.
  const byRole = new Map<number, SignatureFieldGeom[]>();
  for (const f of signatureFields) {
    if (f.role === null) continue;
    const arr = byRole.get(f.role) ?? [];
    arr.push(f);
    byRole.set(f.role, arr);
  }
  if (byRole.size < 2) return { layout: "unknown", columnCount: null };

  // One representative point per party: the topmost (lowest y) field, since
  // that's the actual signature line for that party, not a stray date/text
  // field placed elsewhere on the page.
  const points = Array.from(byRole.values()).map((fields) =>
    fields.reduce((best, f) => (f.y < best.y ? f : best))
  );

  let sameBandSeparatedX = 0;
  let distinctBand = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      if (a.page !== b.page) {
        distinctBand++;
        continue;
      }
      const sameBand = Math.abs(a.y - b.y) <= Y_BAND;
      const xGap = Math.abs(a.x - b.x) >= X_GAP;
      if (sameBand && xGap) sameBandSeparatedX++;
      else distinctBand++;
    }
  }

  if (sameBandSeparatedX > 0 && sameBandSeparatedX >= distinctBand) {
    // Rough column count: distinct x-clusters among same-page points,
    // quantized to a coarse grid so near-duplicate x positions count as one
    // column rather than each looking distinct.
    const xClusters = new Set(points.map((p) => Math.round(p.x * 5) / 5));
    return { layout: "side_by_side_columns", columnCount: Math.max(2, Math.min(xClusters.size, points.length)) };
  }
  if (distinctBand > 0) return { layout: "stacked_blocks", columnCount: null };
  return { layout: "unknown", columnCount: null };
}

// Rounds to the nearest `step` -- used to keep logged coordinates coarse
// (page-zone-level, not exact-pixel) so a row can't be used to reconstruct a
// specific document's precise geometry. Clamped to [min, max] since rounding
// can push an edge value (e.g. 0.98 at a 0.1 step) just past the valid range.
export function quantize(value: number, step: number, min = 0, max = 1): number {
  const rounded = Math.round(value / step) * step;
  // Avoid float noise like 0.30000000000000004 from the division/multiply
  // above -- round to a fixed number of decimals based on the step size.
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  const clean = Number(rounded.toFixed(decimals));
  return Math.min(Math.max(clean, min), max);
}
