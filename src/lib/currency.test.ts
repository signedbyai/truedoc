import { describe, it, expect } from "vitest";
import { currencyForCountry, normalizeCurrency, formatPrice, otherCurrencies } from "./currency";

describe("currencyForCountry", () => {
  it("maps eurozone countries to EUR", () => {
    for (const c of ["NL", "DE", "FR", "IE", "ES", "BE", "AT", "FI"]) {
      expect(currencyForCountry(c)).toBe("EUR");
    }
  });

  it("maps de-facto euro users to EUR", () => {
    for (const c of ["ME", "XK", "MC", "AD"]) {
      expect(currencyForCountry(c)).toBe("EUR");
    }
  });

  it("is case-insensitive", () => {
    expect(currencyForCountry("nl")).toBe("EUR");
  });

  it("maps the UK and Crown Dependencies to GBP", () => {
    for (const c of ["GB", "IM", "JE", "GG"]) {
      expect(currencyForCountry(c)).toBe("GBP");
    }
  });

  it("maps Switzerland and Liechtenstein to CHF", () => {
    for (const c of ["CH", "LI"]) {
      expect(currencyForCountry(c)).toBe("CHF");
    }
  });

  it("maps everyone else to USD", () => {
    for (const c of ["US", "CA", "AU", "PL", "SE", "DK", "ID", "JP"]) {
      expect(currencyForCountry(c)).toBe("USD");
    }
  });

  it("falls back to USD when country is missing", () => {
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry(undefined)).toBe("USD");
    expect(currencyForCountry("")).toBe("USD");
  });
});

describe("normalizeCurrency", () => {
  it("accepts valid currencies case-insensitively", () => {
    expect(normalizeCurrency("EUR")).toBe("EUR");
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("gbp")).toBe("GBP");
    expect(normalizeCurrency("CHF")).toBe("CHF");
  });

  it("rejects anything else", () => {
    expect(normalizeCurrency("JPY")).toBeNull();
    expect(normalizeCurrency("")).toBeNull();
    expect(normalizeCurrency(undefined)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats each currency's own amounts", () => {
    expect(formatPrice("USD", "starter", { withPeriod: true })).toBe("$7/mo");
    expect(formatPrice("EUR", "starter", { withPeriod: true })).toBe("€7/mo");
    expect(formatPrice("EUR", "business")).toBe("€29");
  });

  // GBP and CHF are held below parity so the real price stays in the same
  // premium band as EUR — £7/CHF 7 would have been ~+35%/+24% over $7.
  it("uses the FX-adjusted GBP and CHF amounts, not parity", () => {
    expect(formatPrice("GBP", "starter", { withPeriod: true })).toBe("£6/mo");
    expect(formatPrice("GBP", "team", { withPeriod: true })).toBe("£12/mo");
    expect(formatPrice("GBP", "business")).toBe("£25");
    expect(formatPrice("CHF", "team", { withPeriod: true })).toBe("CHF 12/mo");
    expect(formatPrice("CHF", "business")).toBe("CHF 25");
  });

  it("spaces multi-letter codes so CHF doesn't jam against the number", () => {
    expect(formatPrice("CHF", "starter", { withPeriod: true })).toBe("CHF 6/mo");
    expect(formatPrice("CHF", "free")).toBe("CHF 0");
  });

  it("shows free as a plain zero with no period", () => {
    expect(formatPrice("USD", "free", { withPeriod: true })).toBe("$0");
    expect(formatPrice("EUR", "free")).toBe("€0");
  });
});

describe("otherCurrencies", () => {
  it("returns the three a visitor can switch to", () => {
    expect(otherCurrencies("EUR")).toEqual(["USD", "GBP", "CHF"]);
    expect(otherCurrencies("USD")).toEqual(["EUR", "GBP", "CHF"]);
  });
});
