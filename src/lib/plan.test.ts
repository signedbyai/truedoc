import { describe, expect, it } from "vitest";
import { planHasFeature, teamMemberLimit } from "./plan";

describe("planHasFeature", () => {
  it("gates templates/reminders to starter, team, and business", () => {
    for (const feature of ["templates", "reminders"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(true);
      expect(planHasFeature("team", feature)).toBe(true);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  it("gates teamMembers/bulkSend/branding to team and business", () => {
    for (const feature of ["teamMembers", "bulkSend", "branding"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(true);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  it("gates customBranding, apiAccess, and paymentCollection to business only", () => {
    for (const feature of ["customBranding", "apiAccess", "paymentCollection"] as const) {
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

describe("teamMemberLimit", () => {
  it("caps team at 3 and business at 5", () => {
    expect(teamMemberLimit("team")).toBe(3);
    expect(teamMemberLimit("business")).toBe(5);
  });

  it("has no cap for plans without the teamMembers feature", () => {
    expect(teamMemberLimit("free")).toBeNull();
    expect(teamMemberLimit("starter")).toBeNull();
  });

  it("treats a missing/null plan as free (no cap, since it's blocked earlier anyway)", () => {
    expect(teamMemberLimit(null)).toBeNull();
    expect(teamMemberLimit(undefined)).toBeNull();
  });
});
