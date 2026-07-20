import { describe, expect, it } from "vitest";
import {
  AUTH_CODE_LENGTH,
  authCodeExpiryIso,
  generateAuthCode,
  hashAuthCode,
  isWithinResendCooldown,
} from "./auth-code";

describe("generateAuthCode", () => {
  it("always returns a zero-padded 6-digit string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateAuthCode();
      expect(code).toHaveLength(AUTH_CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashAuthCode", () => {
  it("is deterministic for the same code and signer id", () => {
    expect(hashAuthCode("123456", "signer-a")).toBe(hashAuthCode("123456", "signer-a"));
  });

  it("differs for the same code across different signer ids", () => {
    expect(hashAuthCode("123456", "signer-a")).not.toBe(hashAuthCode("123456", "signer-b"));
  });

  it("differs for different codes with the same signer id", () => {
    expect(hashAuthCode("123456", "signer-a")).not.toBe(hashAuthCode("654321", "signer-a"));
  });
});

describe("authCodeExpiryIso", () => {
  it("returns a timestamp roughly 10 minutes in the future", () => {
    const before = Date.now();
    const expiry = new Date(authCodeExpiryIso()).getTime();
    const after = Date.now();
    expect(expiry).toBeGreaterThanOrEqual(before + 10 * 60 * 1000 - 1000);
    expect(expiry).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 1000);
  });
});

describe("isWithinResendCooldown", () => {
  it("is false when no code has been issued yet", () => {
    expect(isWithinResendCooldown(null)).toBe(false);
  });

  it("is true just after a code was issued", () => {
    const now = 1_000_000_000_000;
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // issued at `now`
    expect(isWithinResendCooldown(expiresAt, now + 5_000)).toBe(true);
  });

  it("is false once the cooldown window has passed", () => {
    const now = 1_000_000_000_000;
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // issued at `now`
    expect(isWithinResendCooldown(expiresAt, now + 31_000)).toBe(false);
  });
});
