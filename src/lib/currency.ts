// Adaptive currency for pricing display + Stripe checkout.
//
// USD is the default / rest-of-world currency (the product's stated target is
// the US). Eurozone visitors see and are charged EUR, the UK GBP, and
// Switzerland/Liechtenstein CHF.
//
// Amounts are clean local numbers held to a roughly consistent premium over
// the USD price (~6-15%), NOT strict parity. Straight parity looked simple but
// silently charged very different real prices: at 2026-07 rates £7 was ~+35%
// over $7 and CHF 7 ~+24%, while €7 was ~+14%. GBP and CHF were adjusted down
// on 2026-07-17 so no market is singled out. Deliberately not FX-exact —
// rates drift and chasing them means constant re-pricing; review annually.
//
// This module is client-safe: no next/headers import here, so both the
// server pages and the client PricingCards can share the table and
// formatters. The request-reading helper (geo + cookie) lives in
// currency.server.ts, which is server-only.

export type Currency = "USD" | "EUR" | "GBP" | "CHF";
export type PlanKey = "free" | "starter" | "team" | "business";

// The 20 euro-area countries, plus the microstates and territories that use
// the euro de facto (Andorra, Monaco, San Marino, Vatican, Montenegro,
// Kosovo).
const EUROZONE = new Set([
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
  "AD", "MC", "SM", "VA", "ME", "XK",
]);

// The UK plus the Crown Dependencies, which use GBP or a GBP-pegged local
// note that Stripe settles as GBP.
const STERLING = new Set(["GB", "IM", "JE", "GG"]);

// Switzerland and Liechtenstein (which uses the Swiss franc).
const FRANC = new Set(["CH", "LI"]);

export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return "USD";
  const code = country.toUpperCase();
  if (EUROZONE.has(code)) return "EUR";
  if (STERLING.has(code)) return "GBP";
  if (FRANC.has(code)) return "CHF";
  return "USD";
}

// Cookie that lets a visitor override the geo guess (the currency switcher,
// and the escape hatch for VPN/wrong-geo). Read on both the pricing display
// and at checkout, so what someone picks is what they're charged.
export const CURRENCY_COOKIE = "sb_currency";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CHF"];

export function normalizeCurrency(value: string | null | undefined): Currency | null {
  const up = value?.toUpperCase() as Currency | undefined;
  return up && CURRENCIES.includes(up) ? up : null;
}

// Amounts in whole currency units. Free is 0 everywhere. The checkout currency
// is selected by picking that currency's Stripe price — we never send an
// amount to Stripe from here, so these figures MUST match the amounts on the
// corresponding Stripe prices.
export const PRICE_TABLE: Record<Currency, { symbol: string; code: Currency; plans: Record<PlanKey, number> }> = {
  USD: { symbol: "$", code: "USD", plans: { free: 0, starter: 7, team: 14, business: 29 } },
  EUR: { symbol: "€", code: "EUR", plans: { free: 0, starter: 7, team: 14, business: 29 } },
  GBP: { symbol: "£", code: "GBP", plans: { free: 0, starter: 6, team: 12, business: 25 } },
  CHF: { symbol: "CHF", code: "CHF", plans: { free: 0, starter: 6, team: 12, business: 25 } },
};

// "$0" / "$7" / "$7/mo", and "CHF 7/mo" — multi-letter codes read better with
// a space than jammed against the number.
export function formatPrice(currency: Currency, plan: PlanKey, opts?: { withPeriod?: boolean }): string {
  const { symbol, plans } = PRICE_TABLE[currency];
  const amount = plans[plan];
  const base = symbol.length > 1 ? `${symbol} ${amount}` : `${symbol}${amount}`;
  if (plan === "free") return base;
  return opts?.withPeriod ? `${base}/mo` : base;
}

// The currencies a visitor can switch to from the one they're seeing.
export function otherCurrencies(current: Currency): Currency[] {
  return CURRENCIES.filter((c) => c !== current);
}
