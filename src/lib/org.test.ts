import { describe, expect, it } from "vitest";
import { resolveActiveOrgId } from "./org";

const orgs = [{ id: "org-b" }, { id: "org-a" }]; // already most-recent-first, like the real query's order()

describe("resolveActiveOrgId", () => {
  it("honors a stored preference that matches a real membership", () => {
    expect(resolveActiveOrgId(orgs, "org-a")).toBe("org-a");
  });

  it("falls back to the most-recently-joined org when there's no stored preference", () => {
    expect(resolveActiveOrgId(orgs, null)).toBe("org-b");
    expect(resolveActiveOrgId(orgs, undefined)).toBe("org-b");
  });

  it("falls back to the most-recently-joined org when the stored preference is stale (no longer a real membership)", () => {
    // e.g. the user was removed from that org, or it was deleted, since
    // they last set it as active.
    expect(resolveActiveOrgId(orgs, "org-that-no-longer-exists")).toBe("org-b");
  });

  it("returns null when the user has no memberships at all", () => {
    expect(resolveActiveOrgId([], "org-a")).toBe(null);
    expect(resolveActiveOrgId([], null)).toBe(null);
  });

  it("returns the only org for a single-membership user regardless of preference", () => {
    expect(resolveActiveOrgId([{ id: "only-org" }], null)).toBe("only-org");
    expect(resolveActiveOrgId([{ id: "only-org" }], "some-other-id")).toBe("only-org");
  });
});
