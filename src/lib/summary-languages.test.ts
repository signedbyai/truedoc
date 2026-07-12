import { describe, expect, it } from "vitest";
import { detectSummaryLang, isSupportedSummaryLang, summaryLanguageLabel } from "./summary-languages";

describe("detectSummaryLang", () => {
  it("maps a region-qualified locale to its primary language subtag", () => {
    expect(detectSummaryLang("pt-BR")).toBe("pt");
    expect(detectSummaryLang("en-US")).toBe("en");
    expect(detectSummaryLang("zh-CN")).toBe("zh");
  });

  it("falls back to English for an unsupported language", () => {
    expect(detectSummaryLang("fi-FI")).toBe("en");
    expect(detectSummaryLang("ko")).toBe("en");
  });

  it("falls back to English for empty/missing input", () => {
    expect(detectSummaryLang(undefined)).toBe("en");
    expect(detectSummaryLang(null)).toBe("en");
    expect(detectSummaryLang("")).toBe("en");
  });

  it("is case-insensitive", () => {
    expect(detectSummaryLang("ES-es")).toBe("es");
  });
});

describe("isSupportedSummaryLang / summaryLanguageLabel", () => {
  it("agrees on the supported set", () => {
    expect(isSupportedSummaryLang("nl")).toBe(true);
    expect(summaryLanguageLabel("nl")).toBe("Dutch");
    expect(isSupportedSummaryLang("xx")).toBe(false);
    expect(summaryLanguageLabel("xx")).toBe("English");
  });
});
