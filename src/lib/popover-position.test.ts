import { describe, expect, it } from "vitest";
import { computePopoverPosition } from "./popover-position";

function rect(partial: Partial<DOMRect>): DOMRect {
  return { top: 0, bottom: 40, left: 0, right: 32, width: 32, height: 40, x: 0, y: 0, toJSON: () => ({}), ...partial };
}

describe("computePopoverPosition", () => {
  it("grows leftward from the trigger for align='left'", () => {
    const { left, top } = computePopoverPosition(rect({ left: 400, right: 432 }), 288, "left", 1200);
    expect(left).toBe(400);
    expect(top).toBe(48); // bottom (40) + default gap (8)
  });

  it("grows rightward from the trigger for align='right' (its own right edge)", () => {
    const { left } = computePopoverPosition(rect({ left: 400, right: 432 }), 288, "right", 1200);
    expect(left).toBe(432 - 288);
  });

  it("centers under the trigger for align='center'", () => {
    const { left } = computePopoverPosition(rect({ left: 400, right: 432, width: 32 }), 288, "center", 1200);
    expect(left).toBe(400 + 16 - 144); // trigger midpoint minus half the popover width
  });

  it("clamps to the left margin when the naive position would run off the left edge", () => {
    const { left } = computePopoverPosition(rect({ left: -20, right: 12 }), 288, "left", 1200);
    expect(left).toBe(8); // the margin, not -20
  });

  it("clamps to the right margin when the naive position would run off the right edge (the reported mobile bug)", () => {
    // A trigger near the right side of a 375px-wide phone screen.
    const { left } = computePopoverPosition(rect({ left: 300, right: 332 }), 288, "center", 375);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 288).toBeLessThanOrEqual(375);
  });
});
