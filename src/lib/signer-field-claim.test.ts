import { describe, it, expect } from "vitest";
import { ownerOfField } from "./signer-field-claim";

describe("ownerOfField", () => {
  const owned = (o: { signer_id?: string | null; template_role?: number | null }) => ({
    type: "signature",
    signer_id: o.signer_id ?? null,
    template_role: o.template_role ?? null,
  });

  it("uses an explicit signer_id", () => {
    expect(ownerOfField(owned({ signer_id: "s1" }), ["s1", "s2"])).toBe("s1");
  });

  // THE BUG THAT SHIPPED: senders routinely place fields without clicking the
  // recipient chip, so signer_id is null on a large share of single-recipient
  // documents. Checking signer_id alone silently reported nothing on exactly
  // those, which is the commonest kind of document there is.
  it("falls back to the sole signer for an unassigned, untagged field", () => {
    expect(ownerOfField(owned({}), ["only"])).toBe("only");
  });

  it("refuses to guess when there is more than one signer", () => {
    expect(ownerOfField(owned({}), ["s1", "s2"])).toBeNull();
  });

  // Mirrors visibleFieldsForSigner: a field still tagged for a party was never
  // generic. Attributing it to the only signer would report one person as
  // having filled a field meant to distinguish two.
  it("refuses the sole-signer fallback when the field is still role-tagged", () => {
    expect(ownerOfField(owned({ template_role: 1 }), ["only"])).toBeNull();
  });

  it("role tag does not override an explicit signer_id", () => {
    expect(ownerOfField(owned({ signer_id: "s1", template_role: 1 }), ["s1"])).toBe("s1");
  });

  it("returns null when there are no signers at all", () => {
    expect(ownerOfField(owned({}), [])).toBeNull();
  });

  it("treats template_role 0 as a real tag, not as falsy", () => {
    // 0 is a valid role number — a `!field.template_role` check would wrongly
    // let this through to the sole-signer fallback.
    expect(ownerOfField(owned({ template_role: 0 }), ["only"])).toBeNull();
  });
});
