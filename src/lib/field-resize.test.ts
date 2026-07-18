import { describe, expect, it } from "vitest";
import { resizeField, MIN_FIELD_W, MIN_FIELD_H, type Rect } from "./field-resize";

const orig: Rect = { x: 0.4, y: 0.4, width: 0.2, height: 0.1 };

describe("resizeField", () => {
  it("grows from the bottom-right corner, keeping the top-left anchored", () => {
    const r = resizeField({ corner: { left: false, top: false }, orig, dx: 0.1, dy: 0.05 });
    expect(r.x).toBeCloseTo(0.4);
    expect(r.y).toBeCloseTo(0.4);
    expect(r.width).toBeCloseTo(0.3);
    expect(r.height).toBeCloseTo(0.15);
  });

  it("grows from the top-left corner, keeping the bottom-right anchored", () => {
    const r = resizeField({ corner: { left: true, top: true }, orig, dx: -0.1, dy: -0.05 });
    expect(r.x).toBeCloseTo(0.3);
    expect(r.y).toBeCloseTo(0.35);
    expect(r.width).toBeCloseTo(0.3);
    expect(r.height).toBeCloseTo(0.15);
  });

  it("shrinks but never below the minimum size", () => {
    const r = resizeField({ corner: { left: false, top: false }, orig, dx: -1, dy: -1 });
    expect(r.width).toBeCloseTo(MIN_FIELD_W);
    expect(r.height).toBeCloseTo(MIN_FIELD_H);
    // top-left stayed put
    expect(r.x).toBeCloseTo(0.4);
    expect(r.y).toBeCloseTo(0.4);
  });

  it("clamps the dragged corner to the page edges", () => {
    const r = resizeField({ corner: { left: false, top: false }, orig, dx: 5, dy: 5 });
    expect(r.x + r.width).toBeLessThanOrEqual(1.0001);
    expect(r.y + r.height).toBeLessThanOrEqual(1.0001);
  });

  it("resizes only width when dragging a corner horizontally", () => {
    const r = resizeField({ corner: { left: true, top: false }, orig, dx: 0.05, dy: 0 });
    expect(r.height).toBeCloseTo(orig.height);
    expect(r.width).toBeCloseTo(0.15);
  });
});
