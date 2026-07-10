import { describe, expect, it } from "vitest";
import { extractApiKey, generateApiKey, hashApiKey } from "./api-key";

describe("generateApiKey", () => {
  it("produces a key with the expected prefix and a matching hash", () => {
    const { raw, hash, prefix } = generateApiKey();
    expect(raw.startsWith("sb_live_")).toBe(true);
    expect(hashApiKey(raw)).toBe(hash);
    expect(raw.startsWith(prefix)).toBe(true);
  });

  it("generates unique keys each time", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("sb_live_abc")).toBe(hashApiKey("sb_live_abc"));
  });

  it("differs for different inputs", () => {
    expect(hashApiKey("sb_live_abc")).not.toBe(hashApiKey("sb_live_xyz"));
  });
});

describe("extractApiKey", () => {
  it("reads a Bearer token from the Authorization header", () => {
    const req = new Request("https://example.com", { headers: { Authorization: "Bearer sb_live_abc123" } });
    expect(extractApiKey(req)).toBe("sb_live_abc123");
  });

  it("falls back to X-API-Key header", () => {
    const req = new Request("https://example.com", { headers: { "X-API-Key": "sb_live_abc123" } });
    expect(extractApiKey(req)).toBe("sb_live_abc123");
  });

  it("returns null when no key is present", () => {
    const req = new Request("https://example.com");
    expect(extractApiKey(req)).toBeNull();
  });
});
