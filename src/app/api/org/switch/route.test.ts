import { describe, expect, it } from "vitest";
import { bodySchema } from "./route";

describe("org switch bodySchema", () => {
  it("accepts a valid uuid orgId", () => {
    expect(bodySchema.safeParse({ orgId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" }).success).toBe(true);
  });

  it("rejects a non-uuid string (e.g. a stray org name)", () => {
    expect(bodySchema.safeParse({ orgId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a missing orgId field", () => {
    expect(bodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse("nope").success).toBe(false);
  });
});
