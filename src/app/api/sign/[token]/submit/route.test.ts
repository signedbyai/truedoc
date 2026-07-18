import { describe, expect, it } from "vitest";
import { bodySchema } from "./schema";

describe("submit route bodySchema", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts consent + a map of field id -> value", () => {
    const result = bodySchema.safeParse({ consent: true, values: { [uuid]: "Jane Doe" } });
    expect(result.success).toBe(true);
  });

  it("accepts an empty values map (e.g. all fields optional)", () => {
    const result = bodySchema.safeParse({ consent: true, values: {} });
    expect(result.success).toBe(true);
  });

  it("rejects consent: false — signing requires affirmative consent", () => {
    const result = bodySchema.safeParse({ consent: false, values: {} });
    expect(result.success).toBe(false);
  });

  it("rejects a missing consent field", () => {
    const result = bodySchema.safeParse({ values: {} });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID field key", () => {
    const result = bodySchema.safeParse({ consent: true, values: { "not-a-uuid": "value" } });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string value", () => {
    const result = bodySchema.safeParse({ consent: true, values: { [uuid]: 12345 } });
    expect(result.success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse("nope").success).toBe(false);
    expect(bodySchema.safeParse({}).success).toBe(false);
  });
});
