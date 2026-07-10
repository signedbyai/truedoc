import { describe, expect, it } from "vitest";
import { bodySchema } from "./route";

describe("payment link bodySchema", () => {
  it("accepts a valid https URL with a label", () => {
    const result = bodySchema.safeParse({ payment_link_url: "https://buy.stripe.com/abc123", payment_label: "$500 deposit" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty string to clear the link", () => {
    expect(bodySchema.safeParse({ payment_link_url: "" }).success).toBe(true);
  });

  it("rejects an http:// (non-https) URL", () => {
    expect(bodySchema.safeParse({ payment_link_url: "http://buy.stripe.com/abc123" }).success).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(bodySchema.safeParse({ payment_link_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(bodySchema.safeParse({ payment_link_url: "not a url" }).success).toBe(false);
  });

  it("rejects a missing payment_link_url field", () => {
    expect(bodySchema.safeParse({ payment_label: "Deposit" }).success).toBe(false);
  });

  it("allows omitting the label", () => {
    expect(bodySchema.safeParse({ payment_link_url: "https://buy.stripe.com/abc123" }).success).toBe(true);
  });
});
