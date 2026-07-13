import { describe, expect, it } from "vitest";
import { bodySchema } from "./route";

describe("auto-suggest bodySchema", () => {
  it("accepts enabled: true", () => {
    expect(bodySchema.safeParse({ enabled: true }).success).toBe(true);
  });

  it("accepts enabled: false", () => {
    expect(bodySchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it("rejects a missing enabled field", () => {
    expect(bodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-boolean value", () => {
    expect(bodySchema.safeParse({ enabled: "true" }).success).toBe(false);
    expect(bodySchema.safeParse({ enabled: 1 }).success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse("nope").success).toBe(false);
  });
});
