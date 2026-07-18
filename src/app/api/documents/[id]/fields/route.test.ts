import { describe, expect, it } from "vitest";
import { bodySchema, fieldSchema } from "./schema";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

const validField = {
  type: "signature" as const,
  page: 1,
  x: 0.1,
  y: 0.2,
  width: 0.2,
  height: 0.05,
  required: true,
  signer_id: uuid,
  template_role: null,
};

describe("fieldSchema", () => {
  it("accepts a fully-specified valid field", () => {
    expect(fieldSchema.safeParse(validField).success).toBe(true);
  });

  it("defaults required to true when omitted", () => {
    const { required: _required, ...rest } = validField;
    void _required;
    const result = fieldSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.required).toBe(true);
  });

  it("allows a null signer_id (unassigned field)", () => {
    const result = fieldSchema.safeParse({ ...validField, signer_id: null });
    expect(result.success).toBe(true);
  });

  it("allows a template_role for template-seeded, not-yet-assigned fields", () => {
    const result = fieldSchema.safeParse({ ...validField, signer_id: null, template_role: 2 });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown field type", () => {
    const result = fieldSchema.safeParse({ ...validField, type: "stamp" });
    expect(result.success).toBe(false);
  });

  it("rejects page numbers less than 1", () => {
    const result = fieldSchema.safeParse({ ...validField, page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects coordinates outside the normalized 0-1 range", () => {
    expect(fieldSchema.safeParse({ ...validField, x: -0.1 }).success).toBe(false);
    expect(fieldSchema.safeParse({ ...validField, x: 1.5 }).success).toBe(false);
    expect(fieldSchema.safeParse({ ...validField, height: 2 }).success).toBe(false);
  });

  it("rejects a malformed signer_id", () => {
    const result = fieldSchema.safeParse({ ...validField, signer_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("fields PUT bodySchema", () => {
  it("accepts a list of valid fields", () => {
    const result = bodySchema.safeParse({ fields: [validField, { ...validField, page: 2 }] });
    expect(result.success).toBe(true);
  });

  it("accepts an empty field list (clearing all placed fields)", () => {
    expect(bodySchema.safeParse({ fields: [] }).success).toBe(true);
  });

  it("rejects the payload if any single field is invalid", () => {
    const result = bodySchema.safeParse({ fields: [validField, { ...validField, type: "bogus" }] });
    expect(result.success).toBe(false);
  });

  it("rejects a missing fields array", () => {
    expect(bodySchema.safeParse({}).success).toBe(false);
  });
});
