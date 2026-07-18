import { describe, expect, it } from "vitest";
import { bodySchema } from "./schema";

describe("docgate bodySchema", () => {
  it("accepts a valid https URL with a label", () => {
    const result = bodySchema.safeParse({
      docgate_url: "https://drive.google.com/drive/folders/abc123",
      docgate_label: "Access your welcome kit",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty string to clear the link", () => {
    expect(bodySchema.safeParse({ docgate_url: "" }).success).toBe(true);
  });

  it("rejects an http:// (non-https) URL", () => {
    expect(bodySchema.safeParse({ docgate_url: "http://drive.google.com/drive/folders/abc123" }).success).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(bodySchema.safeParse({ docgate_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(bodySchema.safeParse({ docgate_url: "not a url" }).success).toBe(false);
  });

  it("rejects a missing docgate_url field", () => {
    expect(bodySchema.safeParse({ docgate_label: "Welcome kit" }).success).toBe(false);
  });

  it("allows omitting the label", () => {
    expect(bodySchema.safeParse({ docgate_url: "https://drive.google.com/drive/folders/abc123" }).success).toBe(true);
  });
});
