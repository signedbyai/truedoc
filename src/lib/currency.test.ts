import { describe, it, expect } from "vitest";
import {
  currencyForCountry,
  normalizeCurrency,
  formatPrice,
  otherCurrencies,
  formatCreditPackPrice,
  formatConsoleOveragePrice,
  type Currency,
} from "./currency";

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

  it("maps India to INR", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("in")).toBe("INR");
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
    expect(normalizeCurrency("inr")).toBe("INR");
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

  // INR (2026-08-03, RAZORPAY_INDIA_SCOPE.md's V0.5) — a genuine PPP
  // discount, not an FX-rounding premium like GBP/CHF above, so these
  // numbers are deliberately far below a straight $-to-₹ conversion.
  it("uses the PPP-discounted INR amounts, single-glyph symbol (no space)", () => {
    expect(formatPrice("INR", "starter", { withPeriod: true })).toBe("₹259/mo");
    expect(formatPrice("INR", "team", { withPeriod: true })).toBe("₹529/mo");
    expect(formatPrice("INR", "business")).toBe("₹1099");
    expect(formatPrice("INR", "free")).toBe("₹0");
  });
});

describe("otherCurrencies", () => {
  it("returns the other four a visitor can switch to", () => {
    expect(otherCurrencies("EUR")).toEqual(["USD", "GBP", "CHF", "INR"]);
    expect(otherCurrencies("USD")).toEqual(["EUR", "GBP", "CHF", "INR"]);
  });
});

// 2026-08-01, direct bug report: the credit-pack "Buy 25 more" button
// showed a flat "$5" regardless of visitor currency — this table/formatter
// is the fix (see the doc comment on CREDIT_PACK_PRICE_CENTS above).
describe("formatCreditPackPrice", () => {
  it("formats USD with a leading symbol, no space", () => {
    expect(formatCreditPackPrice("USD")).toBe("$5");
  });

  it("formats EUR at the same nominal amount as USD (1.0x, matches PRICE_TABLE's EUR ratio)", () => {
    expect(formatCreditPackPrice("EUR")).toBe("€5");
  });

  it("formats GBP at the ~0.86x discount (matches PRICE_TABLE's GBP ratio)", () => {
    expect(formatCreditPackPrice("GBP")).toBe("£4");
  });

  it("formats CHF with a space (multi-char symbol), same number as GBP", () => {
    expect(formatCreditPackPrice("CHF")).toBe("CHF 4");
  });

  // INR added as a direct follow-up (2026-08-01) after the EUR/GBP/CHF
  // fix above — ₹199, the PPP-discounted price, not a straight $-to-₹
  // conversion (see the doc comment on CREDIT_PACK_PRICE_CENTS).
  it("formats INR at its PPP-discounted price, single-glyph symbol (no space)", () => {
    expect(formatCreditPackPrice("INR")).toBe("₹199");
  });

  // Defensive coverage: every real Currency has a row in
  // CREDIT_PACK_PRICE_CENTS as of this test, so exercising the actual
  // fallback path needs a value outside the type — guards against a
  // future currency being added to `Currency` without a matching price
  // here silently falling through to something wrong instead of USD.
  it("falls back to the USD price (amount AND symbol together) for a currency with no table entry at all", () => {
    expect(formatCreditPackPrice("JPY" as unknown as Currency)).toBe("$5");
  });
});

// 2026-08-01, direct ask: "make sure the CTA page for verified-badge uses
// the same local price rather than always USD" — this is the fix for
// Console's $0.20/doc overage rate quoted on /verified-badge and
// /console (display only, see the doc comment on
// CONSOLE_OVERAGE_DISPLAY_CENTS above for why this doesn't touch real
// Stripe billing).
describe("formatConsoleOveragePrice", () => {
  it("formats USD/EUR at the same nominal 20¢/20c (EUR at 1.0x, matches the credit pack's EUR ratio)", () => {
    expect(formatConsoleOveragePrice("USD")).toBe("$0.20");
    expect(formatConsoleOveragePrice("EUR")).toBe("€0.20");
  });

  it("formats GBP/CHF at the ~0.86x discount, sharing one number", () => {
    expect(formatConsoleOveragePrice("GBP")).toBe("£0.17");
    expect(formatConsoleOveragePrice("CHF")).toBe("CHF 0.17");
  });

  // ₹8 isn't a new number invented for this fix — it's the exact figure
  // RAZORPAY_INDIA_SCOPE.md already recommended for this same rate.
  it("formats INR as a whole rupee amount, no decimals", () => {
    expect(formatConsoleOveragePrice("INR")).toBe("₹8");
  });

  it("falls back to the USD price for a currency with no table entry at all", () => {
    expect(formatConsoleOveragePrice("JPY" as unknown as Currency)).toBe("$0.20");
  });
});
