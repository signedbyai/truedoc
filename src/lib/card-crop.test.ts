import { describe, expect, it } from "vitest";
import { computeCardCrop } from "./card-crop";

describe("computeCardCrop", () => {
  it("keeps the field fully within the crop bounds (0-100%)", () => {
    const page = { width: 900, height: 1200 };
    const field = { x: 0.1, y: 0.2, width: 0.3, height: 0.05 };
    const crop = computeCardCrop(field, page);

    expect(crop.fieldLeftPct).toBeGreaterThanOrEqual(-0.001);
    expect(crop.fieldTopPct).toBeGreaterThanOrEqual(-0.001);
    expect(crop.fieldLeftPct + crop.fieldWidthPct).toBeLessThanOrEqual(100.001);
    expect(crop.fieldTopPct + crop.fieldHeightPct).toBeLessThanOrEqual(100.001);
  });

  it("never shifts the page image to a positive offset (crop origin is always >= page origin)", () => {
    const page = { width: 900, height: 1200 };
    const field = { x: 0.05, y: 0.05, width: 0.2, height: 0.04 };
    const crop = computeCardCrop(field, page);

    expect(crop.imgLeftPct).toBeLessThanOrEqual(0.001);
    expect(crop.imgTopPct).toBeLessThanOrEqual(0.001);
  });

  it("clamps the crop so it never runs off the right/bottom edge of the page", () => {
    const page = { width: 900, height: 1200 };
    // A field right at the bottom-right corner of the page.
    const field = { x: 0.9, y: 0.95, width: 0.08, height: 0.03 };
    const crop = computeCardCrop(field, page);

    // The visible image's right/bottom edge (imgLeftPct + imgWidthPct) should
    // not leave a gap before 100% — i.e. the crop shouldn't run past the page.
    expect(crop.imgLeftPct + crop.imgWidthPct).toBeGreaterThanOrEqual(99.9);
    expect(crop.imgTopPct + crop.imgHeightPct).toBeGreaterThanOrEqual(99.9);
    expect(crop.fieldLeftPct + crop.fieldWidthPct).toBeLessThanOrEqual(100.001);
    expect(crop.fieldTopPct + crop.fieldHeightPct).toBeLessThanOrEqual(100.001);
  });

  it("produces a crop noticeably larger than the field itself (real zoom, not 1:1)", () => {
    const page = { width: 900, height: 1200 };
    const field = { x: 0.4, y: 0.4, width: 0.2, height: 0.03 };
    const crop = computeCardCrop(field, page);

    // Field should occupy a modest fraction of the crop width, not ~100% of
    // it — confirms real padding/zoom is being applied around the field.
    expect(crop.fieldWidthPct).toBeLessThan(60);
    expect(crop.fieldWidthPct).toBeGreaterThan(5);
  });

  it("handles a field that spans almost the entire page without throwing or producing NaN", () => {
    const page = { width: 900, height: 1200 };
    const field = { x: 0.01, y: 0.01, width: 0.98, height: 0.98 };
    const crop = computeCardCrop(field, page);

    for (const value of Object.values(crop)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
