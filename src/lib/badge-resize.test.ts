import { describe, expect, it } from "vitest";
import {
  BADGE_ASPECT,
  MAX_BADGE_W,
  MIN_BADGE_W,
  cornerBadgeRect,
  fallbackBadgeRect,
  nearestCorner,
  resizeBadge,
  sliderResizeBadge,
  type BadgeRect,
} from "./badge-resize";

describe("fallbackBadgeRect", () => {
  it("sits in the bottom-right of page 1, fully on-page", () => {
    const r = fallbackBadgeRect();
    expect(r.page).toBe(1);
    expect(r.x + r.width).toBeLessThan(1);
    expect(r.y + r.width * BADGE_ASPECT).toBeLessThan(1);
  });
});

describe("cornerBadgeRect", () => {
  it("snaps to each of the four corners with a consistent margin", () => {
    for (const corner of ["bottom-right", "bottom-left", "top-right", "top-left"] as const) {
      const r = cornerBadgeRect(corner, 2, 0.2);
      expect(r.page).toBe(2);
      expect(r.width).toBeCloseTo(0.2);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1);
      expect(r.y + r.width * BADGE_ASPECT).toBeLessThanOrEqual(1);
    }
  });
});

describe("nearestCorner", () => {
  it("round-trips through cornerBadgeRect for all four corners", () => {
    for (const corner of ["bottom-right", "bottom-left", "top-right", "top-left"] as const) {
      const r = cornerBadgeRect(corner, 1, 0.2);
      expect(nearestCorner(r)).toBe(corner);
    }
  });
});

describe("resizeBadge", () => {
  const orig: BadgeRect = { page: 1, x: 0.3, y: 0.3, width: 0.2 };

  it("grows width and derives height from BADGE_ASPECT, never independently", () => {
    const r = resizeBadge({ orig, dx: 0.1, dy: 0 });
    expect(r.width).toBeCloseTo(0.3);
    expect(r.x).toBeCloseTo(0.3); // anchor unchanged
  });

  it("clamps to MIN_BADGE_W on a large shrink", () => {
    const r = resizeBadge({ orig, dx: -1, dy: -1 });
    expect(r.width).toBeCloseTo(MIN_BADGE_W);
  });

  it("clamps to MAX_BADGE_W on a large grow", () => {
    const r = resizeBadge({ orig, dx: 1, dy: 1 });
    expect(r.width).toBeCloseTo(MAX_BADGE_W);
  });

  it("stays fully on-page after resizing near the edge", () => {
    const nearEdge: BadgeRect = { page: 1, x: 0.85, y: 0.85, width: 0.1 };
    const r = resizeBadge({ orig: nearEdge, dx: 0.3, dy: 0 });
    expect(r.x + r.width).toBeLessThanOrEqual(1.0001);
  });
});

describe("sliderResizeBadge", () => {
  it("keeps the badge pinned to its current corner while resizing", () => {
    const bottomRight = cornerBadgeRect("bottom-right", 1, 0.2);
    const grown = sliderResizeBadge(bottomRight, 0.3);
    expect(nearestCorner(grown)).toBe("bottom-right");
    expect(grown.x + grown.width).toBeLessThanOrEqual(1.0001);
  });

  it("clamps slider input to the min/max range", () => {
    const rect = cornerBadgeRect("top-left", 1, 0.2);
    expect(sliderResizeBadge(rect, 0.01).width).toBeCloseTo(MIN_BADGE_W);
    expect(sliderResizeBadge(rect, 10).width).toBeCloseTo(MAX_BADGE_W);
  });
});
