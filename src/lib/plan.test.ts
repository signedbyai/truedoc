import { describe, expect, it } from "vitest";
import { planHasFeature, teamMemberLimit, seatsOverLimit } from "./plan";

describe("planHasFeature", () => {
  it("gates templates/reminders/aiDraft/pageViewTracking to starter, team, and business", () => {
    for (const feature of ["templates", "reminders", "aiDraft", "pageViewTracking"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(true);
      expect(planHasFeature("team", feature)).toBe(true);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  it("gates teamMembers/bulkSend to team and business", () => {
    for (const feature of ["teamMembers", "bulkSend"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(true);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  // Branding was a single Team-tier promise (name + logo + colour) from
  // 2026-07-17 until 2026-08-02, when it reverted to Business-only
  // (API_TIER_SCOPE.md, direct instruction: "team should not have the
  // branding so that makes business a bigger step") — see plan.ts's comment
  // on `branding`/`customBranding` for why the reversal happened.
  it("gates branding/customBranding to business only", () => {
    for (const feature of ["branding", "customBranding"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(false);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  // apiAccess itself is unchanged by API_TIER_SCOPE.md (2026-08-02) — still
  // means "unlimited, unmetered," genuinely true only for Business. What
  // changed is api/org/webhooks/route.ts, which now also accepts
  // consoleAccess (tested at the route level, not here) so Pro/Team get
  // real webhook access for the first time, just still metered.
  it("gates apiAccess and paymentCollection to business only", () => {
    for (const feature of ["apiAccess", "paymentCollection"] as const) {
      expect(planHasFeature("free", feature)).toBe(false);
      expect(planHasFeature("starter", feature)).toBe(false);
      expect(planHasFeature("team", feature)).toBe(false);
      expect(planHasFeature("business", feature)).toBe(true);
    }
  });

  // console.signedby.ai: widened to every plan including Free
  // (CONSOLE_FREE_TIER_SCOPE.md, 2026-08-02, direct instruction) — was
  // previously the same tier list as `templates`. Free's console value is
  // narrower than Pro's in practice, since send/bulk-send still require
  // `templates` (tested separately above); this key alone only unlocks
  // reaching console.signedby.ai and its Verified Badge sealing flow.
  // Business orgs also pass this, but api-auth.ts treats them as unmetered
  // via apiAccess instead, so this test only needs to confirm the gate.
  it("gates consoleAccess to every plan including free", () => {
    expect(planHasFeature("free", "consoleAccess")).toBe(true);
    expect(planHasFeature("starter", "consoleAccess")).toBe(true);
    expect(planHasFeature("team", "consoleAccess")).toBe(true);
    expect(planHasFeature("business", "consoleAccess")).toBe(true);
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

describe("seatsOverLimit", () => {
  it("is 0 when member count is within the plan's cap", () => {
    expect(seatsOverLimit(2, "team")).toBe(0);
    expect(seatsOverLimit(3, "team")).toBe(0); // exactly at cap isn't "over"
    expect(seatsOverLimit(5, "business")).toBe(0);
  });

  it("returns how many members over the cap an org is, e.g. after a downgrade", () => {
    expect(seatsOverLimit(4, "team")).toBe(1); // was Business (5), downgraded to Team (3 cap)... plus one
    expect(seatsOverLimit(7, "team")).toBe(4);
    expect(seatsOverLimit(6, "business")).toBe(1);
  });

  it("is always 0 for plans with no seat cap at all", () => {
    expect(seatsOverLimit(50, "free")).toBe(0);
    expect(seatsOverLimit(50, "starter")).toBe(0);
    expect(seatsOverLimit(50, null)).toBe(0);
  });
});
