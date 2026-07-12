"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeCardCrop } from "@/lib/card-crop";

type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

const FIELD_LABELS: Record<FieldType, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
  checkbox: "Checkbox",
};

type Field = {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  value: string | null;
};

type Branding = {
  orgId: string;
  orgName: string;
  hasBranding: boolean;
  hasCustomBranding: boolean;
  hasLogo: boolean;
  brandColor: string | null;
};

type Payment = { url: string; label: string | null } | null;

// System-font stacks for "type to sign" — deliberately not next/font/google
// webfonts: this keeps the signing page free of any external font fetch
// (matches the zero-external-font-dependency choice already made for the
// rest of the app in layout.tsx) while still giving a handful of visually
// distinct handwriting-style options across platforms.
const SIGNATURE_STYLES: { id: string; label: string; fontFamily: string; italic?: boolean }[] = [
  { id: "flowing", label: "Flowing", fontFamily: `"Segoe Script", "Bradley Hand", cursive` },
  { id: "elegant", label: "Elegant", fontFamily: `"Lucida Handwriting", "Brush Script MT", cursive` },
  { id: "casual", label: "Casual", fontFamily: `"Segoe Print", "Comic Sans MS", cursive` },
  { id: "classic", label: "Classic", fontFamily: `Georgia, "Times New Roman", serif`, italic: true },
];

// Renders typed text in the chosen style to an offscreen canvas and returns
// a PNG data URL — same output shape the draw pad already produces, so
// nothing downstream (caching, PDF baking) needs to know which mode was used.
function renderTypedSignature(text: string, style: { fontFamily: string; italic?: boolean }): string {
  const canvas = document.createElement("canvas");
  canvas.width = 440;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const prefix = style.italic ? "italic " : "";
  const maxWidth = canvas.width - 48;
  let fontSize = 56;
  while (fontSize > 18) {
    ctx.font = `${prefix}${fontSize}px ${style.fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  return canvas.toDataURL("image/png");
}

function defaultTypedValue(field: Field, signerName: string | null): string {
  if (!signerName) return "";
  if (field.type === "initials") {
    return signerName
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return signerName;
}

export function SigningView({
  token,
  documentTitle,
  pageCount,
  signerName,
  fields: initialFields,
  branding,
  payment,
}: {
  token: string;
  documentTitle: string;
  pageCount: number;
  signerName: string | null;
  fields: Field[];
  branding: Branding;
  payment: Payment;
}) {
  const accentColor = branding.hasCustomBranding ? branding.brandColor : null;

  function handlePayClick() {
    if (!payment) return;
    fetch(`/api/sign/${token}/payment-click`, { method: "POST" }).catch(() => {});
  }
  const [pageCanvases, setPageCanvases] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialFields.map((f) => [f.id, f.value || ""]))
  );
  const [consent, setConsent] = useState(false);
  const [signaturePadFor, setSignaturePadFor] = useState<string | null>(null);
  // "Type" is the default tab (matches SignNow/DocuSign) since it produces a
  // legible result on the first try; "Draw" remains available as a fallback.
  const [padMode, setPadMode] = useState<"type" | "draw">("type");
  const [typedValue, setTypedValue] = useState("");
  const [typedStyleIndex, setTypedStyleIndex] = useState(0);
  // Remembers the last drawn signature/initials so subsequent fields of the
  // same type in this document are pre-filled instead of forcing a redraw.
  const [savedTypeValues, setSavedTypeValues] = useState<{ signature: string; initials: string }>({
    signature: "",
    initials: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [missingFieldIds, setMissingFieldIds] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const [documentCompleted, setDocumentCompleted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  // One-time first-time-signer guidance. Session-only (no localStorage) —
  // a signing link is normally opened once per document, so there's little
  // value in remembering dismissal across visits, and it keeps this from
  // touching any signer PII.
  const [showIntro, setShowIntro] = useState(true);
  // Mobile "card" mode: one field at a time, zoomed to its spot on the page,
  // instead of pinch-zooming a full letter/A4 page on a small screen.
  // Defaults to "full" (matches server-rendered markup, avoids a hydration
  // mismatch) and flips to "card" on mount if the viewport is narrow — see
  // the mount effect below. Always overridable via the view-mode toggle.
  const [viewMode, setViewMode] = useState<"card" | "full">("full");
  const [cardIndex, setCardIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const padRef = useRef<SignatureCanvas | null>(null);

  const requiredFields = initialFields.filter((f) => f.required);
  const filledRequiredCount = requiredFields.filter((f) => values[f.id]?.trim()).length;
  const nextFieldId = requiredFields.find((f) => !values[f.id]?.trim())?.id ?? null;

  // Every field (required or not) in reading order, for card-mode paging.
  const orderedFields = [...initialFields].sort(
    (a, b) => a.page - b.page || a.y - b.y || a.x - b.x
  );
  const pageByNumber = new Map(pageCanvases.map((p) => [p.page, p]));
  const showCardMode = viewMode === "card" && orderedFields.length > 0 && !loading && pageCanvases.length > 0;
  const clampedCardIndex = Math.min(cardIndex, Math.max(orderedFields.length - 1, 0));
  const currentCardField = orderedFields[clampedCardIndex] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const loadingTask = pdfjsLib.getDocument({ url: `/api/sign/${token}/file` });
      const pdf = await loadingTask.promise;
      const rendered: { page: number; dataUrl: string; width: number; height: number }[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        rendered.push({ page: pageNum, dataUrl: canvas.toDataURL(), width: viewport.width, height: viewport.height });
      }

      if (!cancelled) {
        setPageCanvases(rendered);
        setLoading(false);
      }
    }

    render().catch((err) => {
      console.error("Failed to render PDF", err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // One-time, mount-only viewport check to default into card mode on a
  // phone-sized screen. Deferred to a microtask (not called synchronously in
  // the effect body) to satisfy react-hooks/set-state-in-effect, matching
  // the pattern already used for the verify page's mount-time check.
  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        setViewMode("card");
      }
    });
  }, []);

  function goToCard(index: number) {
    setCardIndex((prev) => {
      if (index < 0 || index >= orderedFields.length) return prev;
      return index;
    });
  }

  function goNextCard() {
    goToCard(clampedCardIndex + 1);
  }

  function goPrevCard() {
    goToCard(clampedCardIndex - 1);
  }

  // Auto-advances the card after the field currently on screen gets filled —
  // no-op outside card mode, and no-op if some other field was the one that
  // just changed (e.g. a saved signature applied instantly to a field that
  // isn't the current card).
  function advanceCardIfCurrent(fieldId: string) {
    if (viewMode === "card" && currentCardField?.id === fieldId) {
      goNextCard();
    }
  }

  function handleCardTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleCardTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Require a clearly horizontal, deliberate swipe so this doesn't fire
    // from an incidental vertical scroll or tap-with-jitter.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNextCard();
      else goPrevCard();
    }
  }

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (value.trim()) {
      setMissingFieldIds((prev) => {
        if (!prev.has(fieldId)) return prev;
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  }

  function scrollToField(fieldId: string) {
    document.getElementById(`field-${fieldId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function saveDrawnSignature() {
    if (!signaturePadFor || !padRef.current) return;
    if (padRef.current.isEmpty()) {
      setSignaturePadFor(null);
      return;
    }
    const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
    setValue(signaturePadFor, dataUrl);
    advanceCardIfCurrent(signaturePadFor);
    const field = initialFields.find((f) => f.id === signaturePadFor);
    if (field?.type === "signature" || field?.type === "initials") {
      setSavedTypeValues((prev) => ({ ...prev, [field.type]: dataUrl }));
    }
    setSignaturePadFor(null);
  }

  function saveTypedSignature() {
    if (!signaturePadFor) return;
    const text = typedValue.trim();
    if (!text) return;
    const dataUrl = renderTypedSignature(text, SIGNATURE_STYLES[typedStyleIndex]);
    setValue(signaturePadFor, dataUrl);
    advanceCardIfCurrent(signaturePadFor);
    const field = initialFields.find((f) => f.id === signaturePadFor);
    if (field?.type === "signature" || field?.type === "initials") {
      setSavedTypeValues((prev) => ({ ...prev, [field.type]: dataUrl }));
    }
    setSignaturePadFor(null);
  }

  // Signature/initials fields open the pad the first time, but once a
  // signature (or initials) has been set once, later fields of the same
  // type in this document are filled instantly instead of asking again.
  // Clicking an already-filled field still reopens the pad (defaulted back
  // to "Type") to redo it.
  function handleSignatureFieldClick(field: Field) {
    if (!values[field.id]) {
      const saved = savedTypeValues[field.type as "signature" | "initials"];
      if (saved) {
        setValue(field.id, saved);
        advanceCardIfCurrent(field.id);
        return;
      }
    }
    setPadMode("type");
    setTypedStyleIndex(0);
    setTypedValue(defaultTypedValue(field, signerName));
    setSignaturePadFor(field.id);
  }

  async function handleSubmit() {
    if (!consent) {
      setError("Please check the consent box before signing.");
      return;
    }
    const missing = initialFields.filter((f) => f.required && !values[f.id]?.trim());
    if (missing.length > 0) {
      setMissingFieldIds(new Set(missing.map((f) => f.id)));
      const labels = Array.from(new Set(missing.map((f) => FIELD_LABELS[f.type])));
      setError(
        `Please fill in the highlighted field${missing.length > 1 ? "s" : ""} (${labels.join(", ")}) before signing.`
      );
      scrollToField(missing[0].id);
      return;
    }

    setSubmitting(true);
    setError("");
    setMissingFieldIds(new Set());
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.missingFieldIds) && data.missingFieldIds.length > 0) {
          setMissingFieldIds(new Set(data.missingFieldIds));
          scrollToField(data.missingFieldIds[0]);
        }
        throw new Error(data.error || "Something went wrong");
      }
      const data = await res.json().catch(() => ({}));
      setDocumentCompleted(Boolean(data.completed));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    setError("");
    try {
      const res = await fetch(`/api/sign/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setShowDeclineModal(false);
      setDeclined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setDeclining(false);
    }
  }

  async function handleOpenSummary() {
    setShowSummaryModal(true);
    if (summary || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await fetch(`/api/sign/${token}/summary`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't generate a summary.");
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSummaryLoading(false);
    }
  }

  if (declined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Declined</h1>
          <p className="mt-2 text-sm text-slate-600">
            You declined to sign{signerName ? `, ${signerName}` : ""}. The sender has been notified.
          </p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Signed</h1>
          <p className="mt-2 text-sm text-slate-600">
            {documentCompleted
              ? "Thanks" + (signerName ? `, ${signerName}` : "") + " — everyone has signed. Your copy is ready below."
              : `Thanks${signerName ? `, ${signerName}` : ""} — your signature has been recorded. You'll receive a copy once everyone has signed.`}
          </p>
          {documentCompleted && (
            <a
              href={`/api/sign/${token}/signed-file`}
              className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Download signed PDF
            </a>
          )}
          {payment && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-900">{payment.label || "A payment is requested for this document."}</p>
              <a
                href={payment.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePayClick}
                className="mt-2 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Pay now
              </a>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24 sm:pb-0">
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3"
        style={accentColor ? { borderBottomColor: accentColor, borderBottomWidth: 2 } : undefined}
      >
        <div className="flex items-center gap-3">
          {branding.hasCustomBranding && branding.hasLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/org/${branding.orgId}/logo`}
              alt={branding.orgName}
              className="h-7 w-7 rounded object-contain"
            />
          )}
          <div>
            <h1 className="text-sm font-semibold text-slate-900">{documentTitle}</h1>
            {signerName && <p className="text-xs text-slate-500">Signing as {signerName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {requiredFields.length > 0 && (
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">
              {filledRequiredCount} of {requiredFields.length} field{requiredFields.length === 1 ? "" : "s"} done
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={handleOpenSummary}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            What am I signing?
          </button>
          <button
            onClick={() => setShowDeclineModal(true)}
            disabled={submitting}
            className="text-sm font-medium text-slate-500 hover:text-red-600"
          >
            Decline to sign
          </button>
          {/* Hidden on narrow screens in favor of the fixed swipe-to-confirm
              bar at the bottom -- avoids two redundant submit affordances on
              a small screen where header space is already cramped. */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            style={accentColor ? { backgroundColor: accentColor } : undefined}
            className="hidden sm:inline-flex"
          >
            {submitting ? "Submitting…" : "Sign & submit"}
          </Button>
        </div>
      </div>

      {showIntro && requiredFields.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-6 py-2.5">
          <p className="text-xs text-blue-900">
            {showCardMode ? (
              <>
                Swipe or tap <strong>Next</strong> to move through each field, then hit{" "}
                <strong>Sign &amp; submit</strong> when you&apos;re done.
              </>
            ) : (
              <>
                Click each highlighted field below to fill it in, then hit <strong>Sign &amp; submit</strong> when
                you&apos;re done.
              </>
            )}
          </p>
          <button
            onClick={() => setShowIntro(false)}
            className="whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Got it
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-2.5 text-xs text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-3.5 w-3.5" />
        I agree to sign this document electronically and understand it carries the same legal weight as a handwritten
        signature.
      </label>

      {payment && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
          <p className="text-xs text-amber-900">{payment.label || "A payment is requested for this document."}</p>
          <a
            href={payment.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePayClick}
            className="whitespace-nowrap rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Pay now
          </a>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-10">
        {loading && <p className="text-sm text-slate-500">Loading document…</p>}

        {!loading && pageCanvases.length > 0 && orderedFields.length > 0 && (
          <div className="flex w-full max-w-sm justify-end">
            <button
              onClick={() => setViewMode(viewMode === "card" ? "full" : "card")}
              className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              {viewMode === "card" ? "View full document" : "Switch to guided view"}
            </button>
          </div>
        )}

        {showCardMode && currentCardField ? (
          <div className="w-full max-w-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                Field {clampedCardIndex + 1} of {orderedFields.length}
              </span>
              {currentCardField.required && <span className="font-medium text-slate-600">Required</span>}
            </div>
            <div className="mb-3 flex gap-1">
              {orderedFields.map((f, i) => (
                <div
                  key={f.id}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    values[f.id]?.trim()
                      ? "bg-emerald-500"
                      : i === clampedCardIndex
                        ? "bg-slate-900"
                        : "bg-slate-200"
                  )}
                />
              ))}
            </div>

            <div
              onTouchStart={handleCardTouchStart}
              onTouchEnd={handleCardTouchEnd}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {(() => {
                const pageInfo = pageByNumber.get(currentCardField.page);
                if (!pageInfo) {
                  return (
                    <div className="flex aspect-[3/2] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-400">
                      Preview unavailable — check the full document
                    </div>
                  );
                }
                const crop = computeCardCrop(currentCardField, pageInfo);
                return (
                  <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 aspect-[3/2]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pageInfo.dataUrl}
                      alt=""
                      className="pointer-events-none absolute max-w-none select-none"
                      style={{
                        left: `${crop.imgLeftPct}%`,
                        top: `${crop.imgTopPct}%`,
                        width: `${crop.imgWidthPct}%`,
                        height: `${crop.imgHeightPct}%`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute rounded border-2 border-blue-500 bg-blue-500/10"
                      style={{
                        left: `${crop.fieldLeftPct}%`,
                        top: `${crop.fieldTopPct}%`,
                        width: `${crop.fieldWidthPct}%`,
                        height: `${crop.fieldHeightPct}%`,
                      }}
                    />
                  </div>
                );
              })()}

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {FIELD_LABELS[currentCardField.type]}
                  {!currentCardField.required && " (optional)"}
                </p>
                <CardFieldInput
                  field={currentCardField}
                  value={values[currentCardField.id] || ""}
                  onChange={(v) => setValue(currentCardField.id, v)}
                  onCommit={() => advanceCardIfCurrent(currentCardField.id)}
                  onOpenPad={() => handleSignatureFieldClick(currentCardField)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={goPrevCard}
                disabled={clampedCardIndex === 0}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Back
              </button>
              {clampedCardIndex === orderedFields.length - 1 ? (
                <span className="text-xs text-slate-500">Last field — hit Sign &amp; submit above when ready</span>
              ) : (
                <button
                  onClick={goNextCard}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        ) : (
          pageCanvases.map(({ page, dataUrl, width, height }) => (
          <div key={page} className="relative border border-slate-300 bg-white shadow-sm" style={{ width, height, maxWidth: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`Page ${page}`} className="pointer-events-none block h-full w-full select-none" />

            {initialFields
              .filter((f) => f.page === page)
              .map((f) => (
                <div
                  key={f.id}
                  id={`field-${f.id}`}
                  className={cn("absolute", f.id === nextFieldId && "next-field-highlight")}
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    width: `${f.width * 100}%`,
                    height: `${f.height * 100}%`,
                  }}
                >
                  <FieldInput
                    field={f}
                    value={values[f.id] || ""}
                    invalid={missingFieldIds.has(f.id)}
                    onChange={(v) => setValue(f.id, v)}
                    onOpenPad={() => handleSignatureFieldClick(f)}
                  />
                </div>
              ))}
          </div>
          ))
        )}

        {!loading && pageCanvases.length === 0 && (
          <p className="text-sm text-red-600">Couldn&apos;t load this document ({pageCount} expected pages).</p>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-6 py-4 text-center text-xs text-slate-400">
        {branding.hasBranding ? `Sent via ${branding.orgName}` : "Signed with SignedBy"}
      </div>

      {/* Mobile-only fixed swipe-to-confirm bar -- the desktop header button
          (hidden here via sm:hidden) covers larger screens. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:hidden">
        <SwipeToSubmit onConfirm={handleSubmit} submitting={submitting} label="Slide to sign & submit" />
      </div>

      {showDeclineModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Decline to sign this document?</p>
            <p className="mt-1 text-xs text-slate-500">
              The sender will be notified. This can&apos;t be undone from your side.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="mt-3 w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                disabled={declining}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {declining ? "Declining…" : "Decline to sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-slate-900">What am I signing?</p>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              AI-generated summary of &quot;{documentTitle}&quot; — for context only, not legal advice. Read the
              full document above before signing.
            </p>
            <div className="mt-3 min-h-[60px] rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {summaryLoading && <span className="text-slate-500">Reading the document…</span>}
              {!summaryLoading && summaryError && <span className="text-red-600">{summaryError}</span>}
              {!summaryLoading && !summaryError && summary}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {signaturePadFor && (() => {
        const padField = initialFields.find((f) => f.id === signaturePadFor);
        const isInitials = padField?.type === "initials";
        const actionLabel = isInitials ? "initials" : "signature";
        return (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
              <p className="mb-3 text-sm font-medium text-slate-700">
                Add your {actionLabel}
              </p>

              <div className="mb-3 flex gap-1 rounded-md bg-slate-100 p-1">
                <button
                  onClick={() => setPadMode("type")}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    padMode === "type" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Type
                </button>
                <button
                  onClick={() => setPadMode("draw")}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    padMode === "draw" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Draw
                </button>
              </div>

              {padMode === "type" ? (
                <>
                  <input
                    type="text"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder={isInitials ? "Your initials" : "Your full name"}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SIGNATURE_STYLES.map((style, i) => (
                      <button
                        key={style.id}
                        onClick={() => setTypedStyleIndex(i)}
                        className={cn(
                          "rounded-md border px-2 py-3 text-center",
                          typedStyleIndex === i
                            ? "border-slate-900 ring-1 ring-slate-900"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span
                          className="block truncate text-xl text-slate-900"
                          style={{ fontFamily: style.fontFamily, fontStyle: style.italic ? "italic" : "normal" }}
                        >
                          {typedValue.trim() || (isInitials ? "AB" : "Your name")}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-400">{style.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setSignaturePadFor(null)}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <Button onClick={saveTypedSignature} disabled={!typedValue.trim()}>
                      Use this {actionLabel}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded border border-slate-300">
                    <SignatureCanvas
                      ref={(ref) => {
                        padRef.current = ref;
                      }}
                      penColor="#0f172a"
                      canvasProps={{ width: 440, height: 160, className: "rounded" }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between">
                    <button
                      onClick={() => padRef.current?.clear()}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSignaturePadFor(null)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <Button onClick={saveDrawnSignature}>Use this {actionLabel}</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function FieldInput({
  field,
  value,
  invalid,
  onChange,
  onOpenPad,
}: {
  field: Field;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
  onOpenPad: () => void;
}) {
  const base = cn(
    "h-full w-full rounded border-2 text-[10px] font-medium",
    invalid && "ring-2 ring-red-500 ring-offset-1"
  );

  if (field.type === "signature" || field.type === "initials") {
    return (
      <button
        onClick={onOpenPad}
        className={cn(
          base,
          "flex items-center justify-center",
          value ? "border-emerald-500 bg-white p-0.5" : "border-blue-500 bg-blue-50 text-blue-700"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Signature" className="h-full w-full object-contain" />
        ) : (
          <>Click to {field.type === "initials" ? "initial" : "sign"}</>
        )}
      </button>
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, "border-amber-500 bg-amber-50 px-1 text-[11px] text-amber-900")}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className={cn(base, "flex items-center justify-center border-emerald-500 bg-emerald-50")}>
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          className="h-3.5 w-3.5"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(base, "border-slate-500 bg-slate-100 px-1 text-[11px] text-slate-800")}
    />
  );
}

// Card-mode's field control — full-size, touch-friendly, laid out normally
// below the zoomed page preview rather than overlaid on top of it (unlike
// FieldInput above, which sits directly on the full-scale page render).
// `onCommit` marks the field as "done" for auto-advance purposes; unlike a
// plain onChange, it deliberately does NOT fire on every keystroke for text
// fields (that would advance the card after the first character typed) —
// only on blur, once there's a non-empty value.
function CardFieldInput({
  field,
  value,
  onChange,
  onCommit,
  onOpenPad,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onOpenPad: () => void;
}) {
  if (field.type === "signature" || field.type === "initials") {
    return (
      <button
        onClick={onOpenPad}
        className={cn(
          "flex min-h-[96px] w-full items-center justify-center rounded-lg border-2 text-sm font-medium",
          value ? "border-emerald-500 bg-white p-2" : "border-blue-500 bg-blue-50 text-blue-700"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Signature" className="h-full max-h-20 w-full object-contain" />
        ) : (
          <>Tap to {field.type === "initials" ? "add initials" : "sign"}</>
        )}
      </button>
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value) onCommit();
        }}
        className="min-h-[52px] w-full rounded-lg border-2 border-amber-500 bg-amber-50 px-3 text-base text-amber-900"
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-[52px] w-full items-center gap-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => {
            onChange(e.target.checked ? "true" : "");
            if (e.target.checked) onCommit();
          }}
          className="h-6 w-6 shrink-0"
        />
        <span className="text-sm text-emerald-900">Check to confirm</span>
      </label>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value.trim()) onCommit();
      }}
      className="min-h-[52px] w-full rounded-lg border-2 border-slate-500 bg-slate-100 px-3 text-base text-slate-800"
    />
  );
}

// Uber/Lyft/iOS-style "slide to confirm" for the final submit action on
// mobile -- a deliberate drag gesture reads as more intentional than a plain
// tap, which is a nice affordance for the one action in the whole flow that
// can't be undone. To be clear about what it isn't: the actual legal weight
// of the signature comes from the consent checkbox + audit trail (unchanged
// by this), not from the gesture -- this is a delight/perception upgrade,
// not a legal one. Uses the Pointer Events API so the same handlers cover
// touch, mouse, and pen without separate code paths.
function SwipeToSubmit({
  onConfirm,
  submitting,
  label,
}: {
  onConfirm: () => void;
  submitting: boolean;
  label: string;
}) {
  const HANDLE_SIZE = 56;
  const CONFIRM_THRESHOLD = 0.8;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startLeft: number } | null>(null);
  const [dragLeft, setDragLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // If a confirmed swipe's submit attempt didn't actually go through (e.g.
  // consent wasn't checked, or a required field was missing -- handleSubmit
  // validates and sets an error, but doesn't throw), `submitting` flips back
  // to false without the page ever unmounting to the "done" screen. Reset
  // the handle so the signer can try again. Deferred to a microtask so this
  // doesn't run as a synchronous setState call inside the effect body.
  useEffect(() => {
    if (confirmed && !submitting) {
      Promise.resolve().then(() => {
        setConfirmed(false);
        setDragLeft(0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  function maxLeft() {
    const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;
    return Math.max(trackWidth - HANDLE_SIZE, 1);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (submitting || confirmed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { startX: e.clientX, startLeft: dragLeft };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const delta = e.clientX - dragStartRef.current.startX;
    const next = Math.min(Math.max(dragStartRef.current.startLeft + delta, 0), maxLeft());
    setDragLeft(next);
  }

  function handlePointerUp() {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setIsDragging(false);
    const completion = dragLeft / maxLeft();
    if (completion >= CONFIRM_THRESHOLD) {
      setDragLeft(maxLeft());
      setConfirmed(true);
      onConfirm();
    } else {
      setDragLeft(0);
    }
  }

  return (
    <div ref={trackRef} className="relative h-14 w-full select-none overflow-hidden rounded-full bg-slate-200">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
        style={{ width: dragLeft + HANDLE_SIZE, transition: isDragging ? "none" : "width 200ms ease" }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-600">
        {submitting ? "Submitting…" : confirmed ? "Confirmed" : label}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          left: dragLeft,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          touchAction: "none",
          transition: isDragging ? "none" : "left 200ms ease",
        }}
        className={cn(
          "absolute top-0 flex items-center justify-center rounded-full bg-slate-900 text-lg text-white shadow-md",
          submitting || confirmed ? "opacity-60" : "cursor-grab active:cursor-grabbing"
        )}
      >
        →
      </div>
    </div>
  );
}
