import { describe, expect, it } from "vitest";
import { bodySchema } from "./route";

describe("sign view bodySchema", () => {
  it("accepts a single valid delta", () => {
    expect(bodySchema.safeParse({ deltas: [{ page: 1, seconds: 8 }] }).success).toBe(true);
  });

  it("accepts multiple deltas in one batch", () => {
    expect(
      bodySchema.safeParse({
        deltas: [
          { page: 1, seconds: 5 },
          { page: 2, seconds: 10 },
        ],
      }).success
    ).toBe(true);
  });

  it("rejects an empty deltas array", () => {
    expect(bodySchema.safeParse({ deltas: [] }).success).toBe(false);
  });

  it("rejects a delta with seconds over the max clamp", () => {
    expect(bodySchema.safeParse({ deltas: [{ page: 1, seconds: 121 }] }).success).toBe(false);
  });

  it("rejects a delta with a zero or negative page/seconds", () => {
    expect(bodySchema.safeParse({ deltas: [{ page: 0, seconds: 5 }] }).success).toBe(false);
    expect(bodySchema.safeParse({ deltas: [{ page: 1, seconds: 0 }] }).success).toBe(false);
    expect(bodySchema.safeParse({ deltas: [{ page: 1, seconds: -5 }] }).success).toBe(false);
  });

  it("rejects a non-integer page or seconds", () => {
    expect(bodySchema.safeParse({ deltas: [{ page: 1.5, seconds: 5 }] }).success).toBe(false);
    expect(bodySchema.safeParse({ deltas: [{ page: 1, seconds: 5.5 }] }).success).toBe(false);
  });

  it("rejects a batch over the 50-delta cap", () => {
    const deltas = Array.from({ length: 51 }, (_, i) => ({ page: i + 1, seconds: 1 }));
    expect(bodySchema.safeParse({ deltas }).success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse({}).success).toBe(false);
  });
});
