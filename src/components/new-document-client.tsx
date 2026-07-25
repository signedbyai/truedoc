"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { UploadCloud, Upload, Sparkles, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiDraftForm } from "@/components/ai-draft-form";
import { MagicQuoteForm } from "@/components/magic-quote-form";
import type { QuoteCurrencySymbol } from "@/lib/quote-types";
import type { DraftDocumentType } from "@/lib/ai-draft-types";

// Shared by all four tab states (upload, AI Drafter, the locked AI Drafter
// upsell, and Magic Quote) so they stay the same size as labels change.
// No min-w here on purpose — the parent is a 3-column grid (see the JSX
// below), so each tab's width comes from its grid column, which always
// divides the available space three ways instead of the old fixed
// min-w-[8rem] flex row, which added up to wider than a narrow phone
// screen and pushed the third tab past the card's edge. text-center keeps
// a short label centered in its column; text-xs/px-2 (vs. sm:text-sm/px-3)
// give the longest label ("AI Drafter · Starter+") more room to fit
// without wrapping on the narrowest columns.
const MODE_TAB_CLASS =
  "w-full rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors sm:px-3 sm:text-sm";

export function NewDocumentClient({
  hasAiDraft,
  defaultQuoteCurrency,
  initialDocumentType,
  initialMode,
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
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "draft" | "quote">(
    initialDocumentType ? "draft" : initialMode ?? "upload"
  );
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const MAX_FILE_BYTES = 25 * 1024 * 1024;

  function handleFileChosen(f: File) {
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
                read as distinct from plain upload even without the ai-comet
                glow — reduced-motion visitors only get a static ring, and
                color/motion alone shouldn't be the only signal. Small
                (h-3.5) and shrink-0 so they hold their size if a label
                wraps on a narrow column. */}
            <span className="inline-flex items-center justify-center gap-1.5">
              <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Upload a file
            </span>
          </button>
          {hasAiDraft ? (
            <button
              onClick={() => setMode("draft")}
              className={cn(
                MODE_TAB_CLASS,
                // Comet lives on this button only in the initial "upload"
                // state, same as the Magic Quote tab below — choosing either
                // AI mode turns both off, not just the one clicked, since
                // they're two answers to the same "which way in?" prompt.
                // Once AI Drafter itself is chosen, the comet hops to the
                // "Describe what you need" box (see ai-draft-form).
                mode === "upload" && "ai-comet",
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
            // matches the "Save as template (Starter+)" pattern in
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
                AI Drafter · Starter+
              </span>
            </a>
          )}
          {/* Free on every plan (2026-07-21) — no locked/upsell state needed,
              unlike the AI Drafter tab above. */}
          <button
            onClick={() => setMode("quote")}
            className={cn(
              MODE_TAB_CLASS,
              // Same shared-comet rule as the AI Drafter tab above: glows
              // only in the initial "upload" state, and hops to Magic
              // Quote's own "Describe the job" box once chosen.
              mode === "upload" && "ai-comet",
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
              {/* Was "New document" — identical to the page's own h1 right
                  above it (2026-07-25). Matches the tab's own label instead,
                  same as how the Magic Quote tab/card title already agree. */}
              <CardTitle>Upload a file</CardTitle>
              <CardDescription>Upload a PDF, then place signature fields on the next screen.</CardDescription>
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
                  if (dropped) handleFileChosen(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) handleFileChosen(chosen);
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

              {file && (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Document title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}

              {status === "error" && (
                <p className="text-sm text-red-600">
                  {errorMessage}
                  {showUpgrade && (
                    <>
                      {" "}
                      <Link href="/pricing" className="font-medium underline">
                        View plans
                      </Link>
                    </>
                  )}
                </p>
              )}

              <Button className="w-full" disabled={!file || status === "uploading"} onClick={handleUpload}>
                {status === "uploading" ? "Uploading…" : "Upload & continue"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
