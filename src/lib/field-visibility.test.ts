import { describe, expect, it } from "vitest";
import { visibleFieldsForSigner, signersWithoutFields, type VisibilityField } from "./field-visibility";

function field(overrides: Partial<VisibilityField> & { id: string }): VisibilityField {
  return { signer_id: null, template_role: null, ...overrides };
}

describe("visibleFieldsForSigner", () => {
  it("always includes fields explicitly assigned to this signer", () => {
    const fields = [field({ id: "a", signer_id: "signer-1" }), field({ id: "b", signer_id: "signer-2" })];
    const result = visibleFieldsForSigner(fields, "signer-1", 2);
    expect(result.map((f) => f.id)).toEqual(["a"]);
  });

  it("shows a genuinely unassigned field (no template_role) to the sole signer", () => {
    const fields = [field({ id: "a", signer_id: null, template_role: null })];
    const result = visibleFieldsForSigner(fields, "signer-1", 1);
    expect(result.map((f) => f.id)).toEqual(["a"]);
  });

  it("does NOT show an unassigned field to the sole signer when it's tagged with a pending template_role", () => {
    // This is the bug: an AI-suggested/template field meant for a second
    // party (e.g. "Party 2") that never got a real recipient must not
    // bleed onto the one signer who does exist — that's how the same
    // signature ends up stamped into two different parties' fields.
    const fields = [field({ id: "a", signer_id: null, template_role: 1 })];
    const result = visibleFieldsForSigner(fields, "signer-1", 1);
    expect(result).toEqual([]);
  });

  it("hides an unassigned field from everyone once there's more than one signer", () => {
    const fields = [field({ id: "a", signer_id: null, template_role: null })];
    const result = visibleFieldsForSigner(fields, "signer-1", 2);
    expect(result).toEqual([]);
  });

  it("hides a pending-template_role field from everyone regardless of signer count", () => {
    const fields = [field({ id: "a", signer_id: null, template_role: 0 })];
    expect(visibleFieldsForSigner(fields, "signer-1", 1)).toEqual([]);
    expect(visibleFieldsForSigner(fields, "signer-1", 3)).toEqual([]);
  });

  it("mixes assigned, generic-unassigned, and pending-role fields correctly for a solo signer", () => {
    const fields = [
      field({ id: "assigned", signer_id: "signer-1" }),
      field({ id: "generic", signer_id: null, template_role: null }),
      field({ id: "pending-role", signer_id: null, template_role: 1 }),
    ];
    const result = visibleFieldsForSigner(fields, "signer-1", 1);
    expect(result.map((f) => f.id).sort()).toEqual(["assigned", "generic"]);
  });
});

describe("signersWithoutFields", () => {
  it("flags a signer who has no field to sign (the reported two-recipient bug)", () => {
    // Both fields assigned to signer-1; signer-2 has none.
    const fields = [field({ id: "a", signer_id: "signer-1" }), field({ id: "b", signer_id: "signer-1" })];
    expect(signersWithoutFields(fields, ["signer-1", "signer-2"])).toEqual(["signer-2"]);
  });

  it("passes when every signer has at least one field", () => {
    const fields = [field({ id: "a", signer_id: "signer-1" }), field({ id: "b", signer_id: "signer-2" })];
    expect(signersWithoutFields(fields, ["signer-1", "signer-2"])).toEqual([]);
  });

  it("does not rescue a multi-signer doc via the sole-signer fallback", () => {
    // Unassigned fields only help when there's exactly one signer.
    const fields = [field({ id: "a" }), field({ id: "b" })];
    expect(signersWithoutFields(fields, ["signer-1", "signer-2"]).sort()).toEqual(["signer-1", "signer-2"]);
  });

  it("a single signer with only unassigned fields is fine", () => {
    const fields = [field({ id: "a" })];
    expect(signersWithoutFields(fields, ["signer-1"])).toEqual([]);
  });
});
