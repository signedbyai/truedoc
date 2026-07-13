import { describe, expect, it } from "vitest";
import { pickMostVisiblePage, computeDeltas, formatEngagement, MAX_SECONDS_PER_DELTA } from "./page-view-tracking";

describe("pickMostVisiblePage", () => {
  it("picks the page with the highest visibility ratio", () => {
    const entries = [
      { page: 1, ratio: 0.1 },
      { page: 2, ratio: 0.9 },
      { page: 3, ratio: 0.6 },
    ];
    expect(pickMostVisiblePage(entries)).toBe(2);
  });

  it("returns null when nothing clears the default 0.5 threshold", () => {
    const entries = [
      { page: 1, ratio: 0.3 },
      { page: 2, ratio: 0.4 },
    ];
    expect(pickMostVisiblePage(entries)).toBeNull();
  });

  it("returns null for an empty entry list (e.g. before any page has rendered)", () => {
    expect(pickMostVisiblePage([])).toBeNull();
  });

  it("respects a custom threshold", () => {
    const entries = [{ page: 1, ratio: 0.35 }];
    expect(pickMostVisiblePage(entries, 0.5)).toBeNull();
    expect(pickMostVisiblePage(entries, 0.3)).toBe(1);
  });

  it("breaks a tie by keeping the first entry seen", () => {
    const entries = [
      { page: 1, ratio: 0.8 },
      { page: 2, ratio: 0.8 },
    ];
    expect(pickMostVisiblePage(entries)).toBe(1);
  });
});

describe("computeDeltas", () => {
  it("returns only what's newly accumulated since the last flush", () => {
    const totals = { 1: 15, 2: 8 };
    const lastSent = { 1: 10, 2: 8 };
    expect(computeDeltas(totals, lastSent)).toEqual([{ page: 1, seconds: 5 }]);
  });

  it("treats a page with no prior flush as starting from zero", () => {
    const totals = { 3: 4 };
    const lastSent = {};
    expect(computeDeltas(totals, lastSent)).toEqual([{ page: 3, seconds: 4 }]);
  });

  it("drops zero and negative deltas", () => {
    const totals = { 1: 10, 2: 5 };
    const lastSent = { 1: 10, 2: 7 }; // page 2 somehow went backwards -- shouldn't happen, but must not send a negative delta
    expect(computeDeltas(totals, lastSent)).toEqual([]);
  });

  it("clamps a single delta to MAX_SECONDS_PER_DELTA", () => {
    const totals = { 1: 10000 };
    const lastSent = {};
    const deltas = computeDeltas(totals, lastSent);
    expect(deltas).toEqual([{ page: 1, seconds: MAX_SECONDS_PER_DELTA }]);
  });

  it("returns an empty array when totals is empty", () => {
    expect(computeDeltas({}, {})).toEqual([]);
  });
});

describe("formatEngagement", () => {
  it("formats sub-minute durations as seconds only", () => {
    expect(formatEngagement(42, 2)).toBe("42s · 2 pages");
  });

  it("formats durations over a minute as minutes and seconds", () => {
    expect(formatEngagement(134, 3)).toBe("2m 14s · 3 pages");
  });

  it("uses singular 'page' for exactly one page", () => {
    expect(formatEngagement(5, 1)).toBe("5s · 1 page");
  });

  it("returns null when there's no engagement yet", () => {
    expect(formatEngagement(0, 0)).toBeNull();
  });
});
