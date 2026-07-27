import { describe, expect, it } from "vitest";
import { computeSignatureLayout, quantize } from "./suggestion-shape";

describe("computeSignatureLayout", () => {
  it("returns unknown for zero parties", () => {
    expect(computeSignatureLayout([], 0)).toEqual({ layout: "unknown", columnCount: null });
  });

  it("returns single_party for exactly one party, regardless of field count", () => {
    const fields = [
      { page: 1, x: 0.1, y: 0.8, role: 0 },
      { page: 1, x: 0.1, y: 0.85, role: 0 },
    ];
    expect(computeSignatureLayout(fields, 1)).toEqual({ layout: "single_party", columnCount: null });
  });

  it("returns unknown when fewer than 2 parties have a role-tagged field", () => {
    // partyCount says 2, but only one role actually shows up in the fields
    // (e.g. the second party's fields were all untagged) -- nothing to
    // compare against.
    const fields = [{ page: 1, x: 0.1, y: 0.8, role: 0 }];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "unknown", columnCount: null });
  });

  it("detects side_by_side_columns for two parties at the same y-band, clearly separated in x", () => {
    const fields = [
      { page: 1, x: 0.1, y: 0.8, role: 0 },
      { page: 1, x: 0.6, y: 0.81, role: 1 },
    ];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "side_by_side_columns", columnCount: 2 });
  });

  it("detects stacked_blocks for two parties in distinct, non-overlapping y-bands", () => {
    const fields = [
      { page: 1, x: 0.1, y: 0.5, role: 0 },
      { page: 1, x: 0.12, y: 0.85, role: 1 },
    ];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "stacked_blocks", columnCount: null });
  });

  it("does not call same-y, same-x (no real gap) parties side by side", () => {
    const fields = [
      { page: 1, x: 0.1, y: 0.8, role: 0 },
      { page: 1, x: 0.12, y: 0.8, role: 1 },
    ];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "stacked_blocks", columnCount: null });
  });

  it("detects a 3-up side_by_side layout with the correct column count", () => {
    const fields = [
      { page: 1, x: 0.05, y: 0.8, role: 0 },
      { page: 1, x: 0.4, y: 0.8, role: 1 },
      { page: 1, x: 0.75, y: 0.8, role: 2 },
    ];
    expect(computeSignatureLayout(fields, 3)).toEqual({ layout: "side_by_side_columns", columnCount: 3 });
  });

  it("uses each party's topmost field as its representative point", () => {
    // Party 1's stray "date" field lower on the page shouldn't drag its
    // representative y down to overlap party 0's actual signature line.
    const fields = [
      { page: 1, x: 0.1, y: 0.5, role: 0 },
      { page: 1, x: 0.6, y: 0.9, role: 1 }, // stray, lower
      { page: 1, x: 0.6, y: 0.5, role: 1 }, // actual signature line
    ];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "side_by_side_columns", columnCount: 2 });
  });

  it("treats two parties on different pages as stacked_blocks, not side by side", () => {
    const fields = [
      { page: 1, x: 0.1, y: 0.8, role: 0 },
      { page: 2, x: 0.1, y: 0.8, role: 1 },
    ];
    expect(computeSignatureLayout(fields, 2)).toEqual({ layout: "stacked_blocks", columnCount: null });
  });
});

describe("quantize", () => {
  it("rounds to the nearest step", () => {
    expect(quantize(0.234, 0.1)).toBe(0.2);
    expect(quantize(0.26, 0.1)).toBe(0.3);
  });

  it("clamps to the given range", () => {
    expect(quantize(0.97, 0.1)).toBe(1);
    expect(quantize(-0.05, 0.1)).toBe(0);
  });

  it("supports a custom range for signed deltas", () => {
    expect(quantize(-0.5, 0.02, -1, 1)).toBe(-0.5);
    expect(quantize(-1.2, 0.02, -1, 1)).toBe(-1);
  });

  it("avoids floating-point noise at a fine step size", () => {
    expect(quantize(0.0599999999999, 0.02)).toBe(0.06);
  });
});
