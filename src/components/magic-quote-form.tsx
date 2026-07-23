"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FrequentSignerPicker, type FrequentSigner } from "@/components/frequent-signer-picker";
import { SenderIdentityPicker, type SenderIdentity } from "@/components/sender-identity-picker";
import {
  computeQuoteTotals,
  QUOTE_CURRENCY_SYMBOLS,
  type QuoteCurrencySymbol,
  type QuoteLineItem,
} from "@/lib/quote-types";

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
  hasTeam = false,
}: {
  defaultCurrency?: QuoteCurrencySymbol;
  hasTeam?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [description, setDescription] = useState("");
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
  // Recipient (optional) -- see frequent-signer-picker.tsx. Selecting a saved
  // contact pre-fills the Bill to fields below (still editable) and pre-fills
  // the document's first recipient once it's created (handleFinalize passes
  // it through as a query param on the redirect; field-editor.tsx picks it up
  // from there) -- so the sender doesn't retype the same counterparty's
  // name/email in two different places.
  const [selectedSigner, setSelectedSigner] = useState<FrequentSigner | null>(null);
  // Prepared by (team orgs only) -- see sender-identity-picker.tsx. A
  // genuinely different question ("who on our team is this quote from," not
  // "who is it for") -- rendered as a visible line on the quote PDF.
  const [preparedBy, setPreparedBy] = useState<SenderIdentity | null>(null);

  function handleSelectSigner(signer: FrequentSigner | null) {
    setSelectedSigner(signer);
    setBillToName(signer?.name ?? "");
    setBillToEmail(signer?.email ?? "");
  }

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
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/quotes/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
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
          preparedByName: preparedBy?.name || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the document.");
      // Only seeds a recipient if the picker selection is still active --
      // hand-editing either Bill to field clears selectedSigner (see the
      // onChange handlers above), so the visible chip highlight never lies
      // about what's about to happen. Reads the live billToName/billToEmail
      // values rather than the picked contact's own fields, so the one case
      // that *doesn't* clear the selection -- MagicQuoteForm's own
      // regeneration/re-render -- still matches what's on the quote.
      const query = new URLSearchParams();
      if (selectedSigner && billToEmail.trim()) {
        query.set("signerName", billToName.trim());
        query.set("signerEmail", billToEmail.trim());
      }
      const qs = query.toString();
      router.push(`/dashboard/documents/${data.id}${qs ? `?${qs}` : ""}`);
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
            <Label htmlFor="quote-title">Quote title</Label>
            <Input id="quote-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-currency">Currency</Label>
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

        <SenderIdentityPicker value={preparedBy} onChange={setPreparedBy} hasTeam={hasTeam} />

        <FrequentSignerPicker value={selectedSigner} onChange={handleSelectSigner} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-name">Bill to (customer name)</Label>
            <Input
              id="bill-to-name"
              value={billToName}
              onChange={(e) => {
                setBillToName(e.target.value);
                setSelectedSigner(null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-email">Customer email (optional)</Label>
            <Input
              id="bill-to-email"
              type="email"
              value={billToEmail}
              onChange={(e) => {
                setBillToEmail(e.target.value);
                setSelectedSigner(null);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valid-until">Valid until (optional)</Label>
          <Input id="valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Line items</Label>
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            {items.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder="Description"
                  className="min-w-[10rem] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })}
                  aria-label="Quantity"
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
                  aria-label="Unit price"
                  className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <span className="w-20 text-right text-sm text-slate-600">
                  {formatAmount(currency, item.quantity * item.unitPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  aria-label="Remove line item"
                  className="text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              + Add line item
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax-rate">Tax rate % (optional)</Label>
          <Input
            id="tax-rate"
            type="number"
            min={0}
            max={100}
            step="any"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
            className="w-32"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-notes">Notes (optional)</Label>
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
            <span>Subtotal</span>
            <span>{formatAmount(currency, totals.subtotal)}</span>
          </div>
          {totals.taxRatePercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({totals.taxRatePercent}%)</span>
              <span>{formatAmount(currency, totals.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatAmount(currency, totals.total)}</span>
          </div>
        </div>

        {finalizeError && <p className="text-sm text-red-600">{finalizeError}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            disabled={finalizing || !title.trim() || !hasValidItems}
            onClick={handleFinalize}
          >
            {finalizing ? "Creating…" : "Create document"}
          </Button>
          <Button
            variant="outline"
            disabled={finalizing}
            onClick={() => {
              setStep("describe");
              setGenerateError("");
            }}
          >
            Start over
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
        <Label htmlFor="quote-description">Describe the job</Label>
        <div className="ai-comet rounded-md">
          <textarea
            id="quote-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`e.g. iPhone 13 screen replacement for Alice, ${currencyPrefix}80 for the part, 1 hour labor at ${currencyPrefix}70/hr`}
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
      <p className="text-xs text-slate-500">
        Review the line items and totals before sending — you&rsquo;re responsible for the final quote.
      </p>

      <Button className="w-full" disabled={!description.trim() || generating} onClick={handleGenerate}>
        {generating ? "Generating quote…" : "Generate quote"}
      </Button>
    </div>
  );
}
