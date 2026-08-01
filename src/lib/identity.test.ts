import { describe, expect, it } from "vitest";
import { resolveIdentityStatus, VERIFICATION_FRESHNESS_DAYS } from "./identity";

describe("resolveIdentityStatus", () => {
  it("reports unverified when there's no identity_verified_at at all", () => {
    expect(resolveIdentityStatus({ identity_verified_at: null, identity_verified_name: null })).toEqual({
      verified: false,
    });
  });

  it("reports unverified if a verified_at exists but the name is missing (defensive — shouldn't happen in practice)", () => {
    expect(
      resolveIdentityStatus({ identity_verified_at: new Date().toISOString(), identity_verified_name: null })
    ).toEqual({ verified: false });
  });

  it("reports verified and not stale for a recent check", () => {
    const result = resolveIdentityStatus({
      identity_verified_at: new Date().toISOString(),
      identity_verified_name: "Jane Doe",
    });
    expect(result).toMatchObject({ verified: true, name: "Jane Doe", stale: false });
  });

  it("reports stale once the check is older than the freshness window", () => {
    const old = new Date(Date.now() - (VERIFICATION_FRESHNESS_DAYS + 5) * 24 * 60 * 60 * 1000).toISOString();
    const result = resolveIdentityStatus({ identity_verified_at: old, identity_verified_name: "Jane Doe" });
    expect(result).toMatchObject({ verified: true, stale: true });
  });

  it("is not yet stale one day before the freshness window closes", () => {
    const almostOld = new Date(
      Date.now() - (VERIFICATION_FRESHNESS_DAYS - 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = resolveIdentityStatus({ identity_verified_at: almostOld, identity_verified_name: "Jane Doe" });
    expect(result).toMatchObject({ verified: true, stale: false });
  });
});
