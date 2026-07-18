import { describe, expect, it } from "vitest";
import { generateReferralCode, referralLink } from "./referral";

describe("generateReferralCode", () => {
  it("produces a code of the requested length from the unambiguous alphabet", () => {
    const code = generateReferralCode(7);
    expect(code).toHaveLength(7);
    // no 0/O/1/I, uppercase + digits only
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7}$/);
  });

  it("is (almost surely) unique across many draws", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateReferralCode()));
    expect(seen.size).toBeGreaterThan(490);
  });
});

describe("referralLink", () => {
  it("builds a /?ref= link with the code", () => {
    expect(referralLink("ABC234")).toContain("/?ref=ABC234");
  });
});
