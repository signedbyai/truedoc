import { describe, it, expect } from "vitest";
import { creditPackPriceFor } from "./stripe";

// 2026-08-01, direct bug report: the credit-pack checkout route charged a
// flat $5 regardless of visitor currency. creditPackPriceFor is the fix —
// covering the fallback case specifically, since that's the one place a
// bug here would silently mischarge someone (see the function's own doc
// comment on why the *currency code* must fall back together with the
// amount, not just the amount alone).
describe("creditPackPriceFor", () => {
  it("returns the priced currency and amount unchanged when configured", () => {
    expect(creditPackPriceFor("EUR")).toEqual({ currency: "EUR", amountCents: 500 });
    expect(creditPackPriceFor("GBP")).toEqual({ currency: "GBP", amountCents: 400 });
    expect(creditPackPriceFor("CHF")).toEqual({ currency: "CHF", amountCents: 400 });
    expect(creditPackPriceFor("USD")).toEqual({ currency: "USD", amountCents: 500 });
  });

  it("falls back to BOTH the USD currency code and amount for an unpriced currency (INR)", () => {
    expect(creditPackPriceFor("INR")).toEqual({ currency: "USD", amountCents: 500 });
  });
});
