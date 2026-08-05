"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { UploadCloud, Upload, Sparkles, Receipt, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiDraftForm } from "@/components/ai-draft-form";
import { MagicQuoteForm } from "@/components/magic-quote-form";
import type { QuoteCurrencySymbol } from "@/lib/quote-types";
import type { DraftDocumentType } from "@/lib/ai-draft-types";
import { formatCreditPackPrice, type Currency } from "@/lib/currency";

// Shared by all four tab states (upload, AI Drafter, the locked AI Drafter
// upsell, and Magic Quote) so they stay the same size as labels change.
// No min-w here on purpose — the parent is a 3-column grid (see the JSX
// below), so each tab's width comes from its grid column, which always
// divides the available space three ways instead of the old fixed
// min-w-[8rem] flex row, which added up to wider than a narrow phone
// screen and pushed the third tab past the card's edge. text-center keeps
// a short label centered in its column; text-xs/px-2 (vs. sm:text-sm/px-3)
// give the longest label ("AI Drafter · Pro+") more room to fit
// without wrapping on the narrowest columns.
const MODE_TAB_CLASS =
  "w-full rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors sm:px-3 sm:text-sm";

export function NewDocumentClient({
  hasAiDraft,
  defaultQuoteCurrency,
  initialDocumentType,
  initialMode,
  currency = "USD",
  uploadButtonColorVariant = "black",
}: {
  hasAiDraft: boolean;
  defaultQuoteCurrency: QuoteCurrencySymbol;
  // Set when arriving from a /templates/[slug] page via
  // ?type=nda — opens straight into the AI Drafter tab with that template
  // preselected. Harmless if the account is on Free (the existing hasAiDraft
  // gate below already falls back to the Upload tab in that case; no
  // special-casing needed here).
  initialDocumentType?: DraftDocumentType;
  // Set when arriving via ?mode=quote|draft (the /magic-quote and
  // /ai-drafter marketing pages link here this way) — lets a feature
  // landing page open straight into the matching tab without needing a
  // specific document type the way ?type= does. ?type= still wins when both
  // could apply (it implies "draft" anyway), so existing /templates links
  // are unaffected.
  initialMode?: "draft" | "quote";
  /** Resolved visitor currency (2026-08-01, direct bug report against the
   *  matching console chat button: "Buy 25 more" here said a hardcoded
   *  "$5" regardless of where the visitor actually was — see
   *  stripe.ts's creditPackPriceFor, the checkout route this button
   *  redirects to). Same getRequestCurrency() resolution
   *  defaultQuoteCurrency above is already derived from. */
  currency?: Currency;
  /** "Upload & continue" button color test (2026-08-05,
   *  uploadContinueButtonColorFlag in flags.ts) — "black" is the
   *  current/default look, "yellow" reuses the existing `cta` Button
   *  variant. Defaults to "black" so this component still renders
   *  sensibly if ever used somewhere the flag isn't resolved. */
  uploadButtonColorVariant?: "black" | "yellow";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Separate ref/input from the dropzone's own fileInputRef (2026-08-05) —
  // opened by the main Upload/Continue button below in its pre-file
  // "Upload" state. Kept distinct rather than reusing the dropzone's input
  // so this one's onChange can tag its entry_point as "button" without the
  // dropzone's onClick handler also firing (two different elements —
  // sharing one <input> would mean whichever handler bound last "owns" its
  // onChange).
  const buttonFileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "draft" | "quote">(
    initialDocumentType ? "draft" : initialMode ?? "upload"
  );
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const MAX_FILE_BYTES = 25 * 1024 * 1024;

  // "Upgrade to Pro" on the cap-hit card below (2026-08-05, direct ask: go
  // straight to Stripe Checkout instead of the /pricing page, "so it's
  // simple") — same POST-then-redirect shape as buyCreditPack below and as
  // pricing-cards.tsx's subscribe(), just hardcoded to "starter" (Pro)
  // since that's the only plan this specific upsell ever offers.
  // `source: "dashboard"` for the same cross-subdomain-cancel_url reason
  // buyCreditPack sends it explicitly below.
  async function upgradeToPro() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter", source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setUpgradeLoading(false);
    }
  }

  // "Buy 25 more" next to "View plans" on the cap-hit error line below —
  // same credit-pack top-up as console chat's capReached bubble
  // (CONSOLE_FREE_TIER_SCOPE.md item #8, built 2026-08-03), offered here
  // too since this is the other real surface someone hits the 3-doc cap
  // through. Same POST-then-redirect shape as that bubble's buyCreditPack.
  // `source: "dashboard"` sent explicitly (2026-08-01, alongside the
  // console-side fix for a real bug there) — this surface already lives
  // on signedby.ai, same as the route's default /dashboard/billing return
  // spot, so behavior is unchanged; explicit rather than relying on the
  // route's fallback so this doesn't silently start meaning something
  // else if that default ever changes.
  async function buyCreditPack() {
    setCreditsLoading(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setCreditsLoading(false);
    }
  }

  // entryPoint covers three ways in: the dropzone is still both a drag-drop
  // target and a click-to-browse trigger ("dropzone" / "browse" — see the
  // onDrop/onClick handlers below), and the main button at the bottom of
  // the card is now a third, unambiguous affordance ("button") for anyone
  // who'd rather not interact with the dashed box at all (2026-08-05,
  // direct ask: "let the user choose it for the upload rather than the
  // dotted box if they prefer" — corrected same day from an earlier version
  // of this change that added a *separate* button next to the dropzone;
  // the actual ask was to repurpose the existing bottom button instead, not
  // add a new one — see its two-label state below). Same
  // "signing_upload_started" event shape/philosophy as
  // "console_upload_started" either way — this just widens which
  // entry_point values show up in it, so dropzone-vs-button preference is
  // visible in the data without any other plumbing.
  function handleFileChosen(f: File, entryPoint: "dropzone" | "browse" | "button") {
    if (f.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Only PDF files are supported right now.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setStatus("error");
      setErrorMessage("File is larger than 25MB.");
      return;
    }

    // Fired once a real, valid file clears both checks above — same
    // position/philosophy as console-chat.tsx's sealSelectedFile: this
    // counts upload *intent*, not final success, so a later network/upload
    // failure downstream doesn't undercount it.
    track("signing_upload_started", { entry_point: entryPoint });

    setStatus("idle");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  }

  // Direct-to-R2 upload in three steps so the file never passes through a
  // Vercel serverless function (whose request body is capped at 4.5 MB):
  //   1. ask our API for a presigned PUT URL (also enforces auth/rate-limit/cap)
  //   2. PUT the file straight to R2
  //   3. finalize — our API validates the PDF and creates the record
  async function handleUpload() {
    if (!file) return;

    // "Upload & continue" button color test (2026-08-05, direct ask) —
    // fired on the click itself, same "counts intent, not final success"
    // philosophy as signing_upload_started above: the button color can
    // only plausibly affect whether someone clicks it, not whether the
    // network upload afterward succeeds, so gating this on the upload's
    // eventual outcome would just add noise to the thing actually being
    // measured. See uploadContinueButtonColorFlag in flags.ts.
    track("signing_continue_clicked", { button_color: uploadButtonColorVariant });

    setStatus("uploading");
    setErrorMessage("");
    setShowUpgrade(false);

    try {
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        setStatus("error");
        setErrorMessage(urlData.error ?? "Upload failed.");
        setShowUpgrade(Boolean(urlData.upgrade));
        return;
      }

      const putRes = await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!putRes.ok) {
        setStatus("error");
        setErrorMessage("Upload failed. Please try again.");
        return;
      }

      const finRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: urlData.documentId,
          key: urlData.key,
          title,
          filename: file.name,
        }),
      });
      const finData = await finRes.json();
      if (!finRes.ok) {
        setStatus("error");
        setErrorMessage(finData.error ?? "Upload failed.");
        setShowUpgrade(Boolean(finData.upgrade));
        return;
      }
      router.push(`/dashboard/documents/${finData.id}`);
    } catch {
      setStatus("error");
      setErrorMessage("Upload failed. Check your connection and try again.");
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">New document</h1>

        {/* Every tab shares MODE_TAB_CLASS and sits in a 3-column grid, so
            they come out the same size instead of each sizing to its own
            label — a set of unequal boxes would read as a primary option
            with afterthoughts beside it, which isn't the relationship here.
            The grid (not a min-width flex row) is what keeps this from
            overflowing a narrow phone screen: three columns always split
            the card's actual width evenly, so there's nothing to overflow. */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode("upload")}
            className={cn(
              MODE_TAB_CLASS,
              mode === "upload"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {/* Icons on all three tabs (2026-07-25) so AI Drafter/Magic Quote
                read as distinct from plain upload without relying on color
                alone. Small (h-3.5) and shrink-0 so they hold their size if
                a label wraps on a narrow column. Neither AI tab glows
                anymore (2026-08-05) — see the dropzone below, which now
                carries that "press here" signal instead. */}
            <span className="inline-flex items-center justify-center gap-1.5">
              <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Sign a file
            </span>
          </button>
          {/* Free on every plan (2026-07-21) — no locked/upsell state needed,
              unlike the AI Drafter tab below. Moved ahead of AI Drafter
              (2026-07-27) — order is now Upload, Magic Quote, AI Drafter. */}
          <button
            onClick={() => setMode("quote")}
            className={cn(
              MODE_TAB_CLASS,
              mode === "quote"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Magic Quote
            </span>
          </button>
          {hasAiDraft ? (
            <button
              onClick={() => setMode("draft")}
              className={cn(
                MODE_TAB_CLASS,
                mode === "draft"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                AI Drafter
              </span>
            </button>
          ) : (
            // Same shape/position as the real tab so the feature is still
            // discoverable, but reads as locked rather than clickable —
            // matches the "Save as template (Pro+)" pattern in
            // field-editor.tsx. Links straight to /pricing rather than
            // switching into a mode the account can't use (the API would
            // just reject it — see POST /api/documents/draft).
            <a
              href="/pricing"
              className={cn(
                MODE_TAB_CLASS,
                "border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                AI Drafter · Pro+
              </span>
            </a>
          )}
        </div>

        {mode === "quote" ? (
          <Card>
            <CardHeader>
              <CardTitle>Magic Quote</CardTitle>
              <CardDescription>
                Describe the job in plain language and get a line-item price quote to review and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MagicQuoteForm defaultCurrency={defaultQuoteCurrency} />
            </CardContent>
          </Card>
        ) : mode === "draft" && hasAiDraft ? (
          <Card>
            <CardHeader>
              <CardTitle>AI-drafted document</CardTitle>
              <CardDescription>
                Describe what you need in plain language and get a starting draft to review and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiDraftForm initialDocumentType={initialDocumentType} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              {/* Was "New document" (2026-07-25), then briefly matched the
                  tab's own "Sign a file" label the way Magic Quote's
                  tab/card title agree. Card copy updated 2026-08-05, direct
                  ask — deliberately diverges from the tab label now: "Sign a
                  file" stays as the compact tab text (width-constrained,
                  shared row with Magic Quote/AI Drafter), while the card
                  itself has room to be more explanatory. Leads with the
                  outcome (a signed document) and the description now names
                  the actual next step (send it out), not just the
                  field-placement step in between. */}
              <CardTitle>Get a document signed</CardTitle>
              <CardDescription>Upload a PDF you already have, place signature fields, and send it out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileChosen(dropped, "dropzone");
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 hover:bg-slate-50",
                  // Moved here from the Magic Quote/AI Drafter tabs
                  // (2026-08-05, direct ask) — this dropzone is the actual
                  // primary action on this page, not those two tabs, so the
                  // "press here" glow belongs on it instead. Off once a file
                  // is chosen (the zone switches to showing the filename,
                  // and the primary action moves to the Upload & continue
                  // button below — see its own black/yellow color test).
                  !file && "upload-glow"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) handleFileChosen(chosen, "browse");
                  }}
                />
                {file ? (
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                ) : (
                  <>
                    {/* Icon above the copy (2026-07-25) — the standard
                        Dropbox/Drive/Notion drop-zone shape, so the
                        interaction reads before anyone parses the sentence. */}
                    <UploadCloud className="mb-2 h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    {/* No next-step-highlight here on purpose (2026-07-25) — a
                        dashed drop-zone with this copy already reads as an
                        upload target without help, and the sweep only made
                        this screen busier: it fired at the same time as the
                        two ai-comet tab glows above, so three things
                        animated for attention at once with nothing clearly
                        primary. Dropping it here keeps next-step-highlight's
                        "genuinely non-obvious" meaning intact for the sites
                        that still use it (sign button, add recipient,
                        docgate link) and leaves the AI tab glow as the one
                        thing this screen draws the eye to. */}
                    <p className="text-sm font-medium text-slate-900">Click to choose a PDF, or drag one here</p>
                    <p className="mt-1 text-xs text-slate-500">Up to 25MB</p>
                  </>
                )}
              </div>

              {/* Hidden input for the main button below's "Upload" state
                  (2026-08-05, direct ask, corrected same day — see the
                  handleFileChosen comment above). Kept unconditionally
                  rendered, not tied to `!file` like the dropzone's
                  placeholder copy, since the ref has to stay valid for the
                  button to open it regardless of file state; the button
                  itself only calls .click() on it pre-file (post-file it
                  runs handleUpload instead), so there's no behavior change
                  from rendering this input at all times. */}
              <input
                ref={buttonFileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (chosen) handleFileChosen(chosen, "button");
                }}
              />

              {file && (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Document title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}

              {/* Cap-hit (showUpgrade) is only ever true from
                  checkFreePlanDocCap's 402 — never a real failure, so it gets
                  its own amber upsell card instead of sharing the red error
                  line below (2026-08-05, direct ask: the old shared styling
                  made a "buy more" moment look like something had broken).
                  Genuine errors — bad file type, oversized file, a failed
                  upload — keep the plain red line. */}
              {status === "error" && !showUpgrade && <p className="text-sm text-red-600">{errorMessage}</p>}

              {status === "error" && showUpgrade && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.75} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-amber-900">You&apos;ve used your 3 free docs this month</p>
                      <p className="text-xs text-amber-700">Upgrade to Pro to send unlimited documents.</p>
                    </div>
                    {/* Upgrade to Pro leads (2026-08-05, direct ask) — it's the
                        better outcome (unlimited, not just +25), so it gets
                        first position and the filled/primary treatment; the
                        credit pack is the secondary, outline option. Equal
                        flex-1 widths (same direct ask) rather than
                        content-hugging, so the two options read as a
                        deliberate pair, not mismatched sizes. */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={upgradeLoading}
                        onClick={upgradeToPro}
                        className="flex-1 border-0 bg-amber-400 text-amber-950 hover:bg-amber-500"
                      >
                        {upgradeLoading ? "Starting checkout…" : "Upgrade to Pro"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={creditsLoading}
                        onClick={buyCreditPack}
                        className="flex-1 bg-white"
                      >
                        {creditsLoading ? "Starting checkout…" : `25 more for ${formatCreditPackPrice(currency)}`}
                      </Button>
                    </div>
                    {/* Small escape hatch for anyone who wants to compare
                        Team/Business too, not just the two options above
                        (2026-08-05, direct ask). */}
                    <Link
                      href="/pricing"
                      className="block text-center text-xs text-amber-700 underline hover:text-amber-900"
                    >
                      view pricing plans
                    </Link>
                  </div>
                </div>
              )}

              {/* Was always "Upload & continue" as one label/one click
                  (2026-08-05, direct ask, corrected same day). Now two
                  states of the same button instead of a separate one next
                  to the dropzone: pre-file it reads "Upload" and just opens
                  the picker (tagged entry_point "button" — see
                  buttonFileInputRef above); once a file's chosen it becomes
                  "Continue" and does the actual handleUpload network chain.
                  Never disabled pre-file (it has to be clickable to open
                  the picker) — the old `!file` half of the disabled check
                  only ever made sense back when this button *was*
                  handleUpload unconditionally. */}
              <Button
                className="w-full"
                variant={uploadButtonColorVariant === "yellow" ? "cta" : "default"}
                disabled={status === "uploading"}
                onClick={file ? handleUpload : () => buttonFileInputRef.current?.click()}
              >
                {status === "uploading" ? "Uploading…" : file ? "Continue" : "Upload"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
