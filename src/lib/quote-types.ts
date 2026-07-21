// Shared between the client (MagicQuoteForm's editable line-item table,
// which needs to recompute totals live as the sender edits) and the server
// (quote-document.ts's AI extraction, and the finalize route's rendering) —
// pure data/math, no AI SDK or Supabase imports, so it's safe in either
// bundle. Same split as ai-draft-types.ts vs. draft-document.ts.

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

// Light locale → symbol guess, same "defensive fallback, not a hard
// requirement" precedent as detectDraftLang in ai-draft-types.ts. Only 3
// symbols for v1 (no full currency-code/formatting system) — good enough to
// stop every quote defaulting to dollars regardless of where the sender is,
// which was the exact inconsistency Michael flagged in the AI-draft
// templates (some hardcoded $, others €).
export const QUOTE_CURRENCY_SYMBOLS = ["$", "€", "£"] as const;
export type QuoteCurrencySymbol = (typeof QUOTE_CURRENCY_SYMBOLS)[number];

export function detectQuoteCurrency(locale: string | undefined | null): QuoteCurrencySymbol {
  if (!locale) return "$";
  const l = locale.toLowerCase();
  if (l.startsWith("en-gb")) return "£";
  if (l === "en" || l.startsWith("en-us") || l.startsWith("en-ca")) return "$";
  // Every other locale this app's language-aware features already handle
  // (es, fr, de, pt, nl, it, and any other en- region) defaults to euro.
  return "€";
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
