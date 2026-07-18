import { describe, expect, it } from "vitest";
import { formatRelativeTime, latestTimestamp, latestViewedByDocument } from "./last-viewed";

const NOW = new Date("2026-07-14T12:00:00Z");

describe("latestTimestamp", () => {
  it("returns null for empty/null-only input", () => {
    expect(latestTimestamp([])).toBeNull();
    expect(latestTimestamp([null, undefined])).toBeNull();
  });

  it("ignores unparseable values and picks the newest", () => {
    expect(
      latestTimestamp(["2026-07-14T10:00:00Z", "not-a-date", null, "2026-07-14T11:30:00Z"])
    ).toBe("2026-07-14T11:30:00Z");
  });
});

describe("latestViewedByDocument", () => {
  it("keeps the newest timestamp per document across mixed sources", () => {
    const map = latestViewedByDocument([
      { documentId: "a", at: "2026-07-14T09:00:00Z" },
      { documentId: "a", at: "2026-07-14T11:00:00Z" },
      { documentId: "b", at: "2026-07-13T09:00:00Z" },
      { documentId: "b", at: null },
      { documentId: "c", at: undefined },
    ]);
    expect(map.get("a")).toBe("2026-07-14T11:00:00Z");
    expect(map.get("b")).toBe("2026-07-13T09:00:00Z");
    expect(map.has("c")).toBe(false);
  });
});

describe("formatRelativeTime", () => {
  it("buckets recency correctly", () => {
    expect(formatRelativeTime("2026-07-14T11:59:30Z", NOW)).toBe("just now");
    expect(formatRelativeTime("2026-07-14T11:56:00Z", NOW)).toBe("4m ago");
    expect(formatRelativeTime("2026-07-14T09:00:00Z", NOW)).toBe("3h ago");
    expect(formatRelativeTime("2026-07-13T10:00:00Z", NOW)).toBe("yesterday");
    expect(formatRelativeTime("2026-07-09T12:00:00Z", NOW)).toBe("5d ago");
  });

  it("falls back to a plain date past a week", () => {
    const out = formatRelativeTime("2026-06-01T12:00:00Z", NOW);
    expect(out).not.toMatch(/ago|yesterday|just now/);
  });

  it("clamps small clock skew to 'just now' instead of negative time", () => {
    expect(formatRelativeTime("2026-07-14T12:00:05Z", NOW)).toBe("just now");
  });
});
