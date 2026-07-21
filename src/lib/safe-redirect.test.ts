import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./safe-redirect";

describe("sanitizeNextPath", () => {
  it("accepts an ordinary relative path", () => {
    expect(sanitizeNextPath("/dashboard/documents/new")).toBe("/dashboard/documents/new");
  });

  it("accepts a relative path with a query string", () => {
    expect(sanitizeNextPath("/dashboard/documents/new?type=nda")).toBe("/dashboard/documents/new?type=nda");
  });

  it("rejects missing/empty input", () => {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
  });

  it("rejects a path that doesn't start with a slash", () => {
    expect(sanitizeNextPath("dashboard")).toBeNull();
    expect(sanitizeNextPath("evil.example/x")).toBeNull();
  });

  it("rejects a protocol-relative URL (browser treats // as a scheme-relative absolute URL)", () => {
    expect(sanitizeNextPath("//evil.example")).toBeNull();
    expect(sanitizeNextPath("//evil.example/dashboard")).toBeNull();
  });

  it("rejects an absolute URL smuggled past the leading-slash check", () => {
    expect(sanitizeNextPath("/redirect?to=https://evil.example")).toBeNull();
    expect(sanitizeNextPath("https://evil.example")).toBeNull();
  });
});
