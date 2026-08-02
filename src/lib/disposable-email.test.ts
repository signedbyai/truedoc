import { describe, it, expect } from "vitest";
import { isDisposableEmailAddress } from "./disposable-email";

describe("isDisposableEmailAddress", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmailAddress("someone@mailinator.com")).toBe(true);
  });

  it("passes a real, non-disposable domain", () => {
    expect(isDisposableEmailAddress("someone@gmail.com")).toBe(false);
  });

  it("passes a custom/company domain not on the list", () => {
    expect(isDisposableEmailAddress("jane@signedby.ai")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isDisposableEmailAddress("Someone@MAILINATOR.COM")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isDisposableEmailAddress("  someone@mailinator.com  ")).toBe(true);
  });
});
