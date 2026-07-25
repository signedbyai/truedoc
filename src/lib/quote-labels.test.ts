import { describe, expect, it } from "vitest";
import { ql, magicQuotePlaceholder, QUOTE_LANGUAGES } from "./quote-labels";

describe("ql", () => {
  it("returns the English label by default", () => {
    expect(ql("subtotal")).toBe("Subtotal");
  });

  it("returns a translated label for a supported language", () => {
    expect(ql("subtotal", "fr")).toBe("Sous-total");
    expect(ql("signature", "de")).toBe("Unterschrift:");
  });

  it("falls back to English for an unsupported or missing language code", () => {
    expect(ql("subtotal", "zh")).toBe("Subtotal");
    expect(ql("subtotal", undefined)).toBe("Subtotal");
    expect(ql("subtotal", "")).toBe("Subtotal");
  });

  it("has a real (non-English-fallback) translation for every non-English supported language", () => {
    // Every key must be fully translated -- a partial-coverage table would
    // silently fall back to English for some languages and not others,
    // which is worse than deciding not to support a language at all. Same
    // completeness bar ai-draft-types.ts's DOCUMENT_TYPES holds itself to.
    // (French, Spanish, and Portuguese's "from" all happen to translate to
    // the same word, "De" -- so this checks against "signature" instead,
    // which is distinct across all 7.)
    for (const lang of QUOTE_LANGUAGES) {
      if (lang.code === "en") continue;
      expect(ql("signature", lang.code)).not.toBe(ql("signature", "en"));
    }
  });
});

describe("magicQuotePlaceholder", () => {
  it("substitutes the currency prefix into the English template", () => {
    expect(magicQuotePlaceholder("$")).toContain("$80");
    expect(magicQuotePlaceholder("$")).toContain("$70/hr");
  });

  it("substitutes the currency prefix into a translated template", () => {
    const fr = magicQuotePlaceholder("€", "fr");
    expect(fr).toContain("€80");
    expect(fr).toContain("main-d'œuvre");
  });

  it("falls back to English for an unsupported language", () => {
    expect(magicQuotePlaceholder("$", "zh")).toBe(magicQuotePlaceholder("$"));
  });
});
