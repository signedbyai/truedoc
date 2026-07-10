import { describe, expect, it } from "vitest";
import { planHasFeature } from "./plan";

describe("planHasFeature", () => {
  it("gates teamMembers/bulkSend/branding to team and business", () => {
    for (const feature of ["teamMembers", "bulkSend", "branding"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(true);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  it("gates customBranding and apiAccess to business only", () => {
    for (const feature of ["customBranding", "apiAccess"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(false);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  it("treats a missing/null plan as free", () => {
    expect(planHasFeature(null, "teamMembers")).toBe(false);
    expect(planHasFeature(undefined, "apiAccess")).toBe(false);
  });
});
