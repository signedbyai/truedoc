import { describe, expect, it } from "vitest";
import { isValidDocumentHash } from "./hash";

const sha256Hash = "a".repeat(64);
const sha512Hash = "b".repeat(128);

describe("isValidDocumentHash", () => {
  it("accepts a 64-char SHA-256 hash — every certificate issued before the SHA-512 switch", () => {
    expect(isValidDocumentHash(sha256Hash)).toBe(true);
  });

  it("accepts a 128-char SHA-512 hash — every certificate issued since", () => {
    expect(isValidDocumentHash(sha512Hash)).toBe(true);
  });

  it("rejects lengths that are neither 64 nor 128", () => {
    expect(isValidDocumentHash("a".repeat(63))).toBe(false);
    expect(isValidDocumentHash("a".repeat(65))).toBe(false);
    expect(isValidDocumentHash("a".repeat(127))).toBe(false);
    expect(isValidDocumentHash("a".repeat(129))).toBe(false);
    expect(isValidDocumentHash("")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidDocumentHash("g".repeat(64))).toBe(false);
    expect(isValidDocumentHash("z".repeat(128))).toBe(false);
    expect(isValidDocumentHash(`${"a".repeat(63)} `)).toBe(false);
  });

  it("rejects uppercase hex (route lowercases before calling this, but the check itself is strict)", () => {
    expect(isValidDocumentHash("A".repeat(64))).toBe(false);
  });
});
