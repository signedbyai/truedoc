import { describe, expect, it } from "vitest";
import { bodySchema } from "./schema";

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

// The Business-plan gate on "anthropic" (and "mistral" always being
// allowed) lives in the route handler itself, not the schema — it needs a
// DB lookup (org.plan), so it isn't unit-testable at the schema level the
// way the shape checks above are. Covered by the sandbox verification pass
// instead (see PHASE 2 commit notes).
