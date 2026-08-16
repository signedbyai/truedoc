import { describe, it, expect } from "vitest";
import { signatureMethodBySigner, type MethodField } from "./signature-method-summary";

const f = (o: Partial<MethodField> = {}): MethodField => ({
  type: o.type ?? "signature",
  signer_id: o.signer_id ?? null,
  template_role: o.template_role ?? null,
  signature_method: o.signature_method ?? null,
});

describe("signatureMethodBySigner", () => {
  it("reports typing", () => {
    const out = signatureMethodBySigner([f({ signer_id: "s1", signature_method: "typed" })], ["s1"]);
    expect(out.get("s1")).toBe("typing");
  });

  it("reports drawing", () => {
    const out = signatureMethodBySigner([f({ signer_id: "s1", signature_method: "drawn" })], ["s1"]);
    expect(out.get("s1")).toBe("drawing");
  });

  it("reports both when a signer used each across fields", () => {
    const out = signatureMethodBySigner(
      [
        f({ signer_id: "s1", signature_method: "typed" }),
        f({ signer_id: "s1", type: "initials", signature_method: "drawn" }),
      ],
      ["s1"]
    );
    expect(out.get("s1")).toBe("drawing and typing");
  });

  it("gives the same phrase regardless of field order", () => {
    const a = signatureMethodBySigner(
      [
        f({ signer_id: "s1", signature_method: "drawn" }),
        f({ signer_id: "s1", signature_method: "typed" }),
      ],
      ["s1"]
    );
    const b = signatureMethodBySigner(
      [
        f({ signer_id: "s1", signature_method: "typed" }),
        f({ signer_id: "s1", signature_method: "drawn" }),
      ],
      ["s1"]
    );
    expect(a.get("s1")).toBe(b.get("s1"));
  });

  it("does not repeat a method used on several fields", () => {
    const out = signatureMethodBySigner(
      [
        f({ signer_id: "s1", signature_method: "typed" }),
        f({ signer_id: "s1", signature_method: "typed" }),
      ],
      ["s1"]
    );
    expect(out.get("s1")).toBe("typing");
  });

  // Silence must mean "not recorded", never a guess about how they signed.
  it("omits a signer entirely when no method was captured", () => {
    const out = signatureMethodBySigner([f({ signer_id: "s1" })], ["s1"]);
    expect(out.has("s1")).toBe(false);
  });

  it("returns an empty map for a pre-migration document", () => {
    const out = signatureMethodBySigner(
      [f({ signer_id: "s1" }), f({ signer_id: "s2", type: "initials" })],
      ["s1", "s2"]
    );
    expect(out.size).toBe(0);
  });

  // THE BUG THAT SHIPPED: a single-recipient document where the sender never
  // clicked the recipient chip leaves signer_id null. Reporting on signer_id
  // alone showed nothing on the commonest kind of document.
  it("attributes an unassigned field to the sole signer", () => {
    const out = signatureMethodBySigner([f({ signature_method: "typed" })], ["only"]);
    expect(out.get("only")).toBe("typing");
  });

  it("does not attribute an unassigned field when there are two signers", () => {
    const out = signatureMethodBySigner([f({ signature_method: "typed" })], ["s1", "s2"]);
    expect(out.size).toBe(0);
  });

  it("does not attribute a still-role-tagged field to the sole signer", () => {
    const out = signatureMethodBySigner(
      [f({ template_role: 1, signature_method: "typed" })],
      ["only"]
    );
    expect(out.size).toBe(0);
  });

  it("ignores non-mark field types", () => {
    const out = signatureMethodBySigner(
      [
        f({ signer_id: "s1", type: "date", signature_method: "typed" }),
        f({ signer_id: "s1", type: "text", signature_method: "drawn" }),
        f({ signer_id: "s1", type: "checkbox", signature_method: "typed" }),
      ],
      ["s1"]
    );
    expect(out.size).toBe(0);
  });

  it("counts initials as a mark", () => {
    const out = signatureMethodBySigner(
      [f({ signer_id: "s1", type: "initials", signature_method: "drawn" })],
      ["s1"]
    );
    expect(out.get("s1")).toBe("drawing");
  });

  it("skips an unrecognised method rather than printing it", () => {
    const out = signatureMethodBySigner(
      [f({ signer_id: "s1", signature_method: "scribbled" })],
      ["s1"]
    );
    expect(out.size).toBe(0);
  });

  it("keeps signers separate on a multi-party document", () => {
    const out = signatureMethodBySigner(
      [
        f({ signer_id: "s1", signature_method: "typed" }),
        f({ signer_id: "s2", signature_method: "drawn" }),
      ],
      ["s1", "s2"]
    );
    expect(out.get("s1")).toBe("typing");
    expect(out.get("s2")).toBe("drawing");
  });

  it("handles no fields", () => {
    expect(signatureMethodBySigner([], ["s1"]).size).toBe(0);
  });
});
