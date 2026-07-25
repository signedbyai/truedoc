import { describe, expect, it } from "vitest";
import { bodySchema } from "./schema";

describe("client-error bodySchema", () => {
  it("accepts a message with no stage", () => {
    expect(bodySchema.safeParse({ message: "Couldn't load this document" }).success).toBe(true);
  });

  it("accepts a message with a stage", () => {
    expect(bodySchema.safeParse({ message: "Timed out after 20000ms", stage: "TimeoutError" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(bodySchema.safeParse({ message: "" }).success).toBe(false);
  });

  it("rejects a missing message", () => {
    expect(bodySchema.safeParse({ stage: "TimeoutError" }).success).toBe(false);
  });

  it("rejects a message over the 500-char cap", () => {
    expect(bodySchema.safeParse({ message: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects a stage over the 50-char cap", () => {
    expect(bodySchema.safeParse({ message: "err", stage: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse({}).success).toBe(false);
  });
});
