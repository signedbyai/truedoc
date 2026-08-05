"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  computeQuoteTotals,
  QUOTE_CURRENCY_SYMBOLS,
  type QuoteCurrencySymbol,
  type QuoteLineItem,
} from "@/lib/quote-types";
import { DRAFT_LANGUAGES, detectDraftLang } from "@/lib/ai-draft-types";
import { ql, magicQuotePlaceholder } from "@/lib/quote-labels";

// A space before the number for multi-letter symbols ("CHF 150.00"), none
// for single-glyph ones ("$150.00") — matches quote-to-pdf.ts's formatAmount
// so the review-step preview and the finalized PDF never disagree.
function formatAmount(currency: string, amount: number): string {
  const formatted = amount.toFixed(2);
  return currency.length > 1 ? `${currency} ${formatted}` : `${currency}${formatted}`;
}

// Two-step flow, same "nothing is final until confirmed" shape as
// AiDraftForm: generating a quote never touches the database — the sender
// reviews and can edit every line item, the tax rate, and the totals (which
// recompute live via computeQuoteTotals, never trusting the AI's own math)
// before anything becomes a real, signable document. See
// src/lib/quote-document.ts and the two API routes this calls into.
//
// `defaultCurrency` comes from the server (the "new document" page calls
// getRequestCurrency() — the same geo/cookie-based signal the pricing and
// checkout pages already use — and converts it via
// quoteCurrencyForAppCurrency in quote-types.ts). That's a materially better
// default than guessing from the browser's language setting: a browser set
// to English doesn't mean the visitor is billing in dollars. Falls back to
// "$" only if the caller doesn't pass one (e.g. a test rendering this
// component directly).
export function MagicQuoteForm({
  defaultCurrency = "$",
}: {
  defaultCurrency?: QuoteCurrencySymbol;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState(() =>
    detectDraftLang(typeof navigator !== "undefined" ? navigator.language : undefined)
  );
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<QuoteCurrencySymbol>(defaultCurrency);
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  // Non-blocking — see BOUNCE_TRACKING_SCOPE.md. This email doesn't send
  // anything itself (it's only carried forward to pre-fill the recipient
  // once the document reaches the field editor), so unlike the actual send
  // flow this is a heads-up only; the real send re-checks it anyway.
  const [billToDomainWarning, setBillToDomainWarning] = useState("");

  // Recomputed on every render from the current (possibly just-edited)
  // items/tax rate — the same pure function the finalize route uses
  // server-side, so what the sender sees here is exactly what ends up on
  // the PDF, never a number the AI proposed directly.
  const totals = useMemo(() => computeQuoteTotals(items, taxRatePercent), [items, taxRatePercent]);

  function updateItem(index: number, patch: Partial<QuoteLineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  async function handleGenerate() {
    // "generate_quote_started" (2026-08-05, direct ask) — no usage counter
    // existed on this tab at all before; fired on every real attempt, not
    // just successful generations, same "started" philosophy as the
    // upload-side events (an AI failure downstream still counts as someone
    // trying to use it).
    track("generate_quote_started");
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/quotes/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't generate a quote.");
      setTitle(data.title);
      setItems(data.items);
      setStep("review");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  // Fires on blur, same trigger as the frequent-signers form
  // (frequent-signers-settings.tsx) — a rough shape check first so a
  // still-obviously-partial value tabbed away from by accident doesn't fire
  // a lookup.
  async function checkBillToEmailOnBlur() {
    const value = billToEmail.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    try {
      const res = await fetch("/api/check-email-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok === false && typeof data.reason === "string") {
        setBillToDomainWarning(data.reason);
      }
    } catch {
      // Best-effort — the real send (documents/[id]/send) checks it again.
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    setFinalizeError("");
    try {
      const res = await fetch("/api/quotes/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          currency,
          billToName,
          billToEmail,
          validUntil,
          notes,
          taxRatePercent,
          items,
          language,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the document.");
      // If the sender typed a real Bill To email, carry it (and the name)
      // straight into the field editor as ?signerName=/?signerEmail= --
      // field-editor.tsx's seeding effect turns that into the sole
      // recipient immediately, no "Suggest fields" click needed, since a
      // customer email just typed into this exact form is about as
      // trustworthy as recipient data gets. Name-only (no email) is left
      // alone here on purpose: the field editor's normal Suggest-fields
      // pass will pick the name back up from the PDF's own "Print Name:"
      // line (see quote-to-pdf.ts) and offer it through the single-signer
      // detected-party banner instead.
      const email = billToEmail.trim();
      const emailLooksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const query = emailLooksValid
        ? `?${new URLSearchParams({ signerName: billToName.trim(), signerEmail: email }).toString()}`
        : "";
      router.push(`/dashboard/documents/${data.id}${query}`);
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : "Something went wrong.");
      setFinalizing(false);
    }
  }

  const hasValidItems = items.length > 0 && items.every((i) => i.description.trim() && i.quantity > 0);

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="quote-title">{ql("quoteTitle", language)}</Label>
            <Input id="quote-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-currency">{ql("currency", language)}</Label>
            <select
              id="quote-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as QuoteCurrencySymbol)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {QUOTE_CURRENCY_SYMBOLS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-name">
              {ql("billTo", language)} ({ql("customerName", language)})
            </Label>
            <Input id="bill-to-name" value={billToName} onChange={(e) => setBillToName(e.target.value)} />
          </div>
          <div className="relative space-y-1.5">
            <Label htmlFor="bill-to-email">
              {ql("customerEmail", language)} ({ql("optional", language)})
            </Label>
            <Input
              id="bill-to-email"
              type="email"
              value={billToEmail}
              onChange={(e) => {
                setBillToEmail(e.target.value);
                setBillToDomainWarning(""); // stale as soon as they're editing again
              }}
              onBlur={checkBillToEmailOnBlur}
            />
            {/* Same floating popover as frequent-signers/signer-correction/
                bulk-send — see BOUNCE_TRACKING_SCOPE.md. */}
            {billToDomainWarning && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setBillToDomainWarning("")}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Double-check this address</p>
                    <button
                      type="button"
                      onClick={() => setBillToDomainWarning("")}
                      aria-label="Close"
                      className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{billToDomainWarning}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valid-until">
            {ql("validUntil", language)} ({ql("optional", language)})
          </Label>
          <Input id="valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>{ql("lineItems", language)}</Label>
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            {items.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder={ql("description", language)}
                  className="min-w-[10rem] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  // `|| ""` (not the bare number) — a controlled number input
                  // whose value is exactly 0 can never be cleared otherwise:
                  // backspacing to empty computes right back to 0 below, and
                  // since that's the same value the field already had, React
                  // resets the DOM back to "0" instead of leaving it blank to
                  // type over. Showing "" for 0 lets an actual empty state
                  // exist on screen; the underlying value stays a real 0
                  // either way (see updateItem/computeQuoteTotals).
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })}
                  aria-label={ql("quantity", language)}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.unitPrice || ""}
                  onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
                  aria-label={ql("unitPrice", language)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <span className="w-20 text-right text-sm text-slate-600">
                  {formatAmount(currency, item.quantity * item.unitPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  aria-label={ql("removeLineItem", language)}
                  className="text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              {ql("addLineItem", language)}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax-rate">
            {ql("taxRate", language)} % ({ql("optional", language)})
          </Label>
          <Input
            id="tax-rate"
            type="number"
            min={0}
            max={100}
            step="any"
            // Same "|| ''" fix as the quantity/unit-price inputs above —
            // this field defaults to 0, so it's the one senders actually hit
            // this on: backspacing the pre-filled "0" recomputed right back
            // to 0 and React snapped the field back to "0" every time,
            // making it impossible to type a real rate at all.
            value={taxRatePercent || ""}
            onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
            className="w-32"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-notes">
            {ql("notes", language)} ({ql("optional", language)})
          </Label>
          <textarea
            id="quote-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full rounded-md border border-slate-300 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>

        <div className="space-y-1 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{ql("subtotal", language)}</span>
            <span>{formatAmount(currency, totals.subtotal)}</span>
          </div>
          {totals.taxRatePercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>
                {ql("tax", language)} ({totals.taxRatePercent}%)
              </span>
              <span>{formatAmount(currency, totals.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>{ql("total", language)}</span>
            <span>{formatAmount(currency, totals.total)}</span>
          </div>
        </div>

        {finalizeError && <p className="text-sm text-red-600">{finalizeError}</p>}

        {/* Start over (secondary) comes first/left, Create document
            (primary) comes last/right and grows into the remaining space —
            continues the eye's path down from the right-aligned Total above
            it, straight into the primary CTA, instead of landing on the
            escape hatch first. Stacked full-width on mobile so a long
            "Create document" label never squeezes "Start over" into an
            awkwardly narrow sliver — sm: and up switches back to a single
            row. Same pattern as ai-draft-form.tsx's review-step buttons,
            kept in sync so a three-button vs two-button set doesn't wrap
            differently. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={finalizing}
            onClick={() => {
              setStep("describe");
              setGenerateError("");
            }}
          >
            {ql("startOver", language)}
          </Button>
          <Button
            className="w-full sm:w-auto sm:flex-1"
            disabled={finalizing || !title.trim() || !hasValidItems}
            onClick={handleFinalize}
          >
            {finalizing ? ql("creating", language) : `${ql("createDocument", language)} →`}
          </Button>
        </div>
      </div>
    );
  }

  // Same currency the review step defaults to (from the visitor's real
  // currency, not a guess — see the component doc comment above), so the
  // example amounts don't show dollars to someone who's about to see euros
  // or pounds on the very next screen. Same multi-letter-symbol spacing as
  // formatAmount.
  const currencyPrefix = currency.length > 1 ? `${currency} ` : currency;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="quote-language">Quote language</Label>
        <select
          id="quote-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          {DRAFT_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quote-description">{ql("describeJob", language)}</Label>
        <div className="ai-comet rounded-md">
          <textarea
            id="quote-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={magicQuotePlaceholder(currencyPrefix, language)}
            rows={4}
            className="block w-full rounded-md border border-slate-300 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>
      </div>

      {generateError && <p className="text-sm text-red-600">{generateError}</p>}

      {/* Lighter touch than AI Drafter's "not legal advice" disclaimer —
          Magic Quote only extracts numbers the sender already stated (never
          invents a price) and the app itself computes every total, so this
          is an ordinary review-your-work reminder, not a legal-risk
          checkbox. See magic-quote-feature.md for the reasoning. */}
      <p className="text-xs text-slate-500">{ql("reviewDisclaimer", language)}</p>

      <Button className="w-full" disabled={!description.trim() || generating} onClick={handleGenerate}>
        {generating ? ql("generatingQuote", language) : ql("generateQuote", language)}
      </Button>
    </div>
  );
}
