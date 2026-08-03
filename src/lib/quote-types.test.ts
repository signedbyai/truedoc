import { describe, expect, it } from "vitest";
import { computeQuoteTotals, quoteCurrencyForAppCurrency, MAX_TAX_RATE_PERCENT } from "./quote-types";

describe("computeQuoteTotals", () => {
  it("computes a single line item with no tax", () => {
    const result = computeQuoteTotals([{ description: "Screen replacement", quantity: 1, unitPrice: 150 }], 0);
    expect(result.lines).toEqual([{ description: "Screen replacement", quantity: 1, unitPrice: 150, lineTotal: 150 }]);
    expect(result.subtotal).toBe(150);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(150);
  });

  it("multiplies quantity by unit price per line and sums across lines", () => {
    const result = computeQuoteTotals(
      [
        { description: "Part", quantity: 1, unitPrice: 80 },
        { description: "Labor", quantity: 1.5, unitPrice: 70 },
      ],
      0
    );
    expect(result.lines[1].lineTotal).toBe(105);
    expect(result.subtotal).toBe(185);
    expect(result.total).toBe(185);
  });

  it("applies a tax rate on top of the subtotal", () => {
    const result = computeQuoteTotals([{ description: "Job", quantity: 1, unitPrice: 100 }], 20);
    expect(result.subtotal).toBe(100);
    expect(result.taxRatePercent).toBe(20);
    expect(result.taxAmount).toBe(20);
    expect(result.total).toBe(120);
  });

  it("never accumulates floating-point drift across many lines (integer-cents internally)", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ description: `Item ${i}`, quantity: 1, unitPrice: 0.1 }));
    const result = computeQuoteTotals(items, 0);
    expect(result.subtotal).toBe(1);
  });

  it("clamps a negative tax rate to 0", () => {
    const result = computeQuoteTotals([{ description: "Job", quantity: 1, unitPrice: 100 }], -5);
    expect(result.taxRatePercent).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("clamps a tax rate above the max down to the max", () => {
    const result = computeQuoteTotals([{ description: "Job", quantity: 1, unitPrice: 100 }], 500);
    expect(result.taxRatePercent).toBe(MAX_TAX_RATE_PERCENT);
  });

  it("clamps a non-finite tax rate to 0", () => {
    const result = computeQuoteTotals([{ description: "Job", quantity: 1, unitPrice: 100 }], NaN);
    expect(result.taxRatePercent).toBe(0);
  });

  it("returns zero totals for an empty line-item list", () => {
    const result = computeQuoteTotals([], 20);
    expect(result.lines).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("quoteCurrencyForAppCurrency", () => {
  it("maps each of the app's 5 billing currencies to its quote symbol", () => {
    expect(quoteCurrencyForAppCurrency("USD")).toBe("$");
    expect(quoteCurrencyForAppCurrency("EUR")).toBe("€");
    expect(quoteCurrencyForAppCurrency("GBP")).toBe("£");
    expect(quoteCurrencyForAppCurrency("CHF")).toBe("CHF");
    expect(quoteCurrencyForAppCurrency("INR")).toBe("₹");
  });
});
