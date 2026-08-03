// Shared between the client (MagicQuoteForm's editable line-item table,
// which needs to recompute totals live as the sender edits) and the server
// (quote-document.ts's AI extraction, and the finalize route's rendering) —
// pure data/math, no AI SDK or Supabase imports, so it's safe in either
// bundle. Same split as ai-draft-types.ts vs. draft-document.ts.

import type { Currency } from "@/lib/currency";

export type QuoteLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type ComputedLineItem = QuoteLineItem & { lineTotal: number };

export type QuoteTotals = {
  lines: ComputedLineItem[];
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
};

// Sanity caps, not real currency limits — just enough to stop a malformed
// AI response or a mis-typed edit from producing an absurd quote (a
// quantity of 999999999 or a unit price with 40 digits). Reused by both the
// lenient AI-response parser (quote-document.ts) and the strict zod schema
// the finalize route validates a (possibly sender-edited) submission
// against, so both layers agree on the same bounds.
export const MAX_LINE_ITEMS = 30;
export const MAX_DESCRIPTION_CHARS = 120;
export const MAX_QUANTITY = 100_000;
export const MAX_UNIT_PRICE = 1_000_000;
export const MAX_TAX_RATE_PERCENT = 100;

// Reuses the app's existing pricing/checkout currency system (currency.ts /
// currency.server.ts — geo IP header, with a cookie override from the
// pricing page's currency switcher) instead of a separate browser-locale
// guess. That system is a better signal than locale (a browser set to
// English doesn't mean the visitor is in the US or UK) and it's already
// exactly the "what currency is this person in" answer the rest of the app
// relies on for billing — one source of truth, not two disagreeing guesses.
// Same 5 currencies pricing supports (INR added 2026-08-03,
// RAZORPAY_INDIA_SCOPE.md's V0.5); CHF (unlike $/€/£/₹) isn't a single
// glyph, so callers that print it (quote-to-pdf.ts, MagicQuoteForm) add a
// space before the amount — see formatAmount in both. ₹ is a single JS
// string-length-1 glyph like the others, so it falls into the same
// no-space branch as $/€/£ with no extra handling needed.
export const QUOTE_CURRENCY_SYMBOLS = ["$", "€", "£", "CHF", "₹"] as const;
export type QuoteCurrencySymbol = (typeof QUOTE_CURRENCY_SYMBOLS)[number];

const CURRENCY_TO_QUOTE_SYMBOL: Record<Currency, QuoteCurrencySymbol> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
  INR: "₹",
};

// Server callers (the "new document" page) resolve the visitor's real
// Currency via getRequestCurrency() and pass the result through this to get
// a default for both MagicQuoteForm's initial currency picker value and,
// implicitly, whatever a sender's job description forgot to mention a
// currency for — the AI never infers currency from the description text
// (see quote-document.ts), so the picker's default IS the fallback.
export function quoteCurrencyForAppCurrency(currency: Currency): QuoteCurrencySymbol {
  return CURRENCY_TO_QUOTE_SYMBOL[currency];
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

// Deliberately the ONLY place quote arithmetic happens. The AI (see
// quote-document.ts) only ever proposes a description/quantity/unit price
// per line — it never computes a subtotal, tax amount, or total itself,
// because LLMs are not reliable at exact multi-line arithmetic and a wrong
// total on a document a customer is about to accept is a real trust
// problem, not a cosmetic one. Every line is rounded to the nearest cent
// independently (the ordinary way a point-of-sale system rounds a line
// item), then the subtotal/tax/total are summed from those already-rounded
// cent values — all integer math internally, so this never accumulates the
// classic 0.1 + 0.2 floating-point drift a naive dollars-as-floats sum
// would.
export function computeQuoteTotals(items: QuoteLineItem[], taxRatePercent: number): QuoteTotals {
  const lines: ComputedLineItem[] = items.map((item) => {
    const lineTotalCents = Math.round(item.quantity * toCents(item.unitPrice));
    return { ...item, lineTotal: fromCents(lineTotalCents) };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.lineTotal), 0);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent)
    ? Math.min(Math.max(taxRatePercent, 0), MAX_TAX_RATE_PERCENT)
    : 0;
  const taxAmountCents = Math.round(subtotalCents * (safeTaxRatePercent / 100));
  const totalCents = subtotalCents + taxAmountCents;

  return {
    lines,
    subtotal: fromCents(subtotalCents),
    taxRatePercent: safeTaxRatePercent,
    taxAmount: fromCents(taxAmountCents),
    total: fromCents(totalCents),
  };
}
