import { describe, expect, it } from "vitest";
import { findFreePosition, rectsOverlap, type Placed } from "./field-geometry";

describe("rectsOverlap", () => {
  it("detects overlapping rectangles", () => {
    const a = { x: 0.1, y: 0.1, width: 0.2, height: 0.1 };
    const b = { x: 0.15, y: 0.12, width: 0.2, height: 0.1 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("returns false for rectangles that don't touch", () => {
    const a = { x: 0.1, y: 0.1, width: 0.1, height: 0.1 };
    const b = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("treats edge-adjacent rectangles as not overlapping", () => {
    // b starts exactly where a ends — sharing an edge, not overlapping.
    const a = { x: 0, y: 0, width: 0.2, height: 0.1 };
    const b = { x: 0.2, y: 0, width: 0.2, height: 0.1 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("is symmetric", () => {
    const a = { x: 0.1, y: 0.1, width: 0.2, height: 0.1 };
    const b = { x: 0.15, y: 0.12, width: 0.2, height: 0.1 };
    expect(rectsOverlap(a, b)).toBe(rectsOverlap(b, a));
  });
});

describe("findFreePosition", () => {
  it("keeps the requested spot when nothing else is on the page", () => {
    const result = findFreePosition(1, 0.1, 0.1, 0.2, 0.05, []);
    expect(result).toEqual({ x: 0.1, y: 0.1 });
  });

  it("ignores fields on a different page", () => {
    const existing: Placed[] = [{ page: 2, x: 0.1, y: 0.1, width: 0.2, height: 0.05 }];
    const result = findFreePosition(1, 0.1, 0.1, 0.2, 0.05, existing);
    expect(result).toEqual({ x: 0.1, y: 0.1 });
  });

  it("nudges away from a field it would otherwise land on top of", () => {
    const existing: Placed[] = [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.05 }];
    const result = findFreePosition(1, 0.1, 0.1, 0.2, 0.05, existing);

    // Must have actually moved...
    expect(result).not.toEqual({ x: 0.1, y: 0.1 });
    // ...to somewhere that no longer collides with the existing field.
    const collides = rectsOverlap({ ...result, width: 0.2, height: 0.05 }, existing[0]);
    expect(collides).toBe(false);
  });

  it("finds a free spot among several existing fields", () => {
    const existing: Placed[] = [
      { page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      { page: 1, x: 0.1, y: 0.16, width: 0.2, height: 0.05 },
      { page: 1, x: 0.1, y: 0.22, width: 0.2, height: 0.05 },
    ];
    const result = findFreePosition(1, 0.1, 0.1, 0.2, 0.05, existing);
    const candidateRect = { ...result, width: 0.2, height: 0.05 };
    for (const field of existing) {
      expect(rectsOverlap(candidateRect, field)).toBe(false);
    }
  });

  it("stays within the 0-1 page bounds while nudging", () => {
    // Start near the bottom-right corner so nudging has nowhere to go but
    // clamp against the edges.
    const existing: Placed[] = [{ page: 1, x: 0.85, y: 0.9, width: 0.15, height: 0.08 }];
    const result = findFreePosition(1, 0.85, 0.9, 0.15, 0.08, existing);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(1 - 0.15 + 1e-9);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(1 - 0.08 + 1e-9);
  });

  it("terminates and returns a position even when the page is fully packed", () => {
    // Tile the entire page so there is nowhere to escape to — the function
    // must give up gracefully after its bounded attempt count rather than
    // hang or throw.
    const existing: Placed[] = [];
    for (let x = 0; x < 1; x += 0.05) {
      for (let y = 0; y < 1; y += 0.05) {
        existing.push({ page: 1, x, y, width: 0.05, height: 0.05 });
      }
    }
    const result = findFreePosition(1, 0.5, 0.5, 0.05, 0.05, existing);
    expect(typeof result.x).toBe("number");
    expect(typeof result.y).toBe("number");
  });
});
