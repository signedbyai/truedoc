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

export type Currency = "USD" | "EUR" | "GBP" | "CHF" | "INR";
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

// India (RAZORPAY_INDIA_SCOPE.md's "V0.5" — Stripe-only, no Razorpay yet).
// Deliberately a Set of one, matching the shape of the others, rather than
// a plain `=== "IN"` check — keeps this branch structurally identical to
// EUROZONE/STERLING/FRANC so a later Razorpay-routed version (or any
// broader PPP market) is a one-line addition, not a rewrite.
const INDIA = new Set(["IN"]);

export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return "USD";
  const code = country.toUpperCase();
  if (EUROZONE.has(code)) return "EUR";
  if (STERLING.has(code)) return "GBP";
  if (FRANC.has(code)) return "CHF";
  if (INDIA.has(code)) return "INR";
  return "USD";
}

// Cookie that lets a visitor override the geo guess (the currency switcher,
// and the escape hatch for VPN/wrong-geo). Read on both the pricing display
// and at checkout, so what someone picks is what they're charged.
export const CURRENCY_COOKIE = "sb_currency";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CHF", "INR"];

export function normalizeCurrency(value: string | null | undefined): Currency | null {
  const up = value?.toUpperCase() as Currency | undefined;
  return up && CURRENCIES.includes(up) ? up : null;
}

// Amounts in whole currency units. Free is 0 everywhere. The checkout currency
// is selected by picking that currency's Stripe price — we never send an
// amount to Stripe from here, so these figures MUST match the amounts on the
// corresponding Stripe prices.
// INR (2026-08-03, RAZORPAY_INDIA_SCOPE.md's "V0.5" probe): NOT held to the
// same "~6-15% premium over USD" convention as EUR/GBP/CHF above — this is
// a deliberate PPP (purchasing-power-parity) discount, not an FX-rounding
// choice. ~55% off the nominal $-to-₹ conversion (₹588 at a ~84 rate),
// matching the common "Tier 3" PPP discount SaaS pricing frameworks use
// for India, and landing comfortably under the RBI's ₹15,000-per-debit
// additional-authentication threshold so a UPI/recurring mandate (once
// built — see the scope doc) never needs re-approval on renewal. Team and
// Business get the same ~45%-of-nominal ratio applied for a consistent
// table, but this is a V0.5, Stripe-cards-only probe scoped around the
// Pro price specifically — see the scope doc before assuming Team/Business
// India pricing is an active go-to-market push.
export const PRICE_TABLE: Record<Currency, { symbol: string; code: Currency; plans: Record<PlanKey, number> }> = {
  USD: { symbol: "$", code: "USD", plans: { free: 0, starter: 7, team: 14, business: 29 } },
  EUR: { symbol: "€", code: "EUR", plans: { free: 0, starter: 7, team: 14, business: 29 } },
  GBP: { symbol: "£", code: "GBP", plans: { free: 0, starter: 6, team: 12, business: 25 } },
  CHF: { symbol: "CHF", code: "CHF", plans: { free: 0, starter: 6, team: 12, business: 25 } },
  INR: { symbol: "₹", code: "INR", plans: { free: 0, starter: 259, team: 529, business: 1099 } },
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

// Credit pack (CONSOLE_FREE_TIER_SCOPE.md item #8) — a one-time 25-seal
// top-up, priced via Stripe Checkout's inline price_data rather than a
// dashboard Price object (see stripe.ts's creditPackPriceFor, the
// server-side checkout counterpart to this — same table, imported from
// here rather than duplicated, so the console chat button's label can
// never disagree with what checkout actually charges).
//
// Went EUR/GBP/CHF-aware 2026-08-01 (direct bug report: a Europe-based
// visitor still saw and was charged a flat $5). Same ~6-15%-premium
// convention as PRICE_TABLE above, reusing that table's exact per-currency
// ratios rather than inventing new ones: $5 → €5 (EUR at 1.0x nominal,
// same as the flat plans), £4 and CHF 4 (both at ~0.86x, GBP and CHF
// always sharing one number in PRICE_TABLE too).
//
// INR added same day, direct follow-up ("please include INR in this") —
// same ~55%-off-nominal PPP ratio PRICE_TABLE's INR row and the Console
// metered-overage INR price both use (RAZORPAY_INDIA_SCOPE.md's "V0.5"),
// not a straight FX conversion: $5 * ~84 ≈ ₹420 nominal, discounted to a
// clean ₹199 (≈0.47x nominal, in the same ~0.44-0.48x band as the other
// INR prices here) rather than an unrounded ₹185. Unlike the flat plan
// prices, this is a one-time Checkout payment (mode: "payment"), not a
// recurring mandate — so the RBI's ₹15,000 additional-factor-
// authentication threshold that constrained the *subscription* INR
// prices doesn't apply here at all; ₹199 has headroom to spare either
// way. `creditPackPriceFor` in stripe.ts still keeps a currency-code
// fallback for defensiveness (any future currency added to the `Currency`
// type without a row here falls back to USD amount+code together, not a
// silent near-free mischarge), but every currency this app actually
// resolves visitors to today has a real entry below now.
export const CREDIT_PACK_PRICE_CENTS: Partial<Record<Currency, number>> = {
  USD: 500,
  EUR: 500,
  GBP: 400,
  CHF: 400,
  INR: 19900,
};

// "$5" / "£4" / "CHF 4" — client-safe (no Stripe SDK import), used by the
// console chat "Buy 25 more" button so its label always matches what
// checkout will actually charge, instead of a hardcoded "$5". Falls back
// to BOTH the USD amount and the USD symbol together for an unpriced
// currency, same "never fall back on just one half" reasoning as
// stripe.ts's creditPackPriceFor — a currency missing from
// CREDIT_PACK_PRICE_CENTS would also have no real reason to be missing
// from PRICE_TABLE only, so mixing a fallback amount with a real
// currency's symbol was never a case worth supporting.
export function formatCreditPackPrice(currency: Currency): string {
  const priced = CREDIT_PACK_PRICE_CENTS[currency] !== undefined ? currency : "USD";
  const amount = CREDIT_PACK_PRICE_CENTS[priced]! / 100;
  const symbol = PRICE_TABLE[priced].symbol;
  return symbol.length > 1 ? `${symbol} ${amount}` : `${symbol}${amount}`;
}

// Console's metered per-document overage rate ($0.20, `CONSOLE_OVERAGE_CENTS`
// in console-usage.ts) — DISPLAY ONLY, for the two pre-signup marketing
// pages that quote it (`/verified-badge`, `/console`), added 2026-08-01
// direct follow-up ("make sure the CTA page for verified-badge uses the
// same local price rather than always USD"). Same conversion ratios as
// everywhere else in this file: EUR at 1.0x nominal, GBP/CHF at ~0.86x
// (20¢ → 17p/17 rappen), INR at the ~55%-off PPP ratio — ₹8, which isn't
// a new number invented for this, it's the exact figure
// RAZORPAY_INDIA_SCOPE.md already recommended for this same rate back on
// 2026-08-03 ("~₹8/doc... $0.20 nominal x 84 x 0.45 ~ ₹7.56").
//
// IMPORTANT — this does NOT touch what a paying org is actually billed.
// `CONSOLE_OVERAGE_CENTS` (console-usage.ts) itself stays a single USD
// number driving the real spend-cap math and the logged-in usage panel —
// deliberately untouched here, out of scope for a marketing-copy fix and
// a materially bigger change (real customer billing display, not a
// pre-signup page). See [[console-overage-price-gap]] for the existing,
// separate, still-open gap on that side: the real Stripe metered Price
// objects per currency aren't confirmed configured, so a non-USD
// customer's actual overage billing may not match either this page's
// copy or the dashboard's own $-denominated panel yet regardless of this
// change — this only makes the *marketing* copy consistent with the rest
// of the site's currency-adaptive convention instead of uniquely
// hardcoded to USD.
const CONSOLE_OVERAGE_DISPLAY_CENTS: Partial<Record<Currency, number>> = {
  USD: 20,
  EUR: 20,
  GBP: 17,
  CHF: 17,
  INR: 800,
};

// "$0.20" / "£0.17" / "₹8" — whole INR rupees show with no decimals
// (Number.isInteger), every other currency's sub-unit price shows two.
// Same both-halves-fall-back-together reasoning as formatCreditPackPrice.
export function formatConsoleOveragePrice(currency: Currency): string {
  const priced = CONSOLE_OVERAGE_DISPLAY_CENTS[currency] !== undefined ? currency : "USD";
  const amount = CONSOLE_OVERAGE_DISPLAY_CENTS[priced]! / 100;
  const amountStr = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const symbol = PRICE_TABLE[priced].symbol;
  return symbol.length > 1 ? `${symbol} ${amountStr}` : `${symbol}${amountStr}`;
}
