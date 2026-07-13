import { describe, expect, it } from "vitest";
import { bodySchema } from "./route";

describe("ai-provider bodySchema", () => {
  it("accepts provider: anthropic", () => {
    expect(bodySchema.safeParse({ provider: "anthropic" }).success).toBe(true);
  });

  it("accepts provider: mistral", () => {
    expect(bodySchema.safeParse({ provider: "mistral" }).success).toBe(true);
  });

  it("rejects an unsupported provider name", () => {
    expect(bodySchema.safeParse({ provider: "openai" }).success).toBe(false);
  });

  it("rejects a missing provider field", () => {
    expect(bodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    expect(bodySchema.safeParse(null).success).toBe(false);
    expect(bodySchema.safeParse("nope").success).toBe(false);
  });
});
