import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("keeps the first local-part character and the full domain", () => {
    expect(maskEmail("jamie@client.com")).toBe("j***@client.com");
  });

  it("works for a single-character local part", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });

  it("returns the input unchanged if there's no @", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });

  it("returns the input unchanged if @ is the first character", () => {
    expect(maskEmail("@nobody.com")).toBe("@nobody.com");
  });
});
