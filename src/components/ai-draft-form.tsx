"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_TYPES,
  DRAFT_LANGUAGES,
  AI_DRAFT_DISCLAIMER,
  AI_DRAFT_CHECKBOX_LABEL,
  detectDraftLang,
  documentTypeLabel,
  documentTypePlaceholder,
  type DraftDocumentType,
} from "@/lib/ai-draft-types";

// Two-step flow, mirroring the "nothing is final until confirmed" pattern
// used elsewhere in this app (AI field-placement suggestions): generating a
// draft never touches the database — the sender reviews and can edit the
// full text before anything becomes a real document. See
// src/lib/draft-document.ts and the two API routes this calls into.
//
// `initialDocumentType` lets a caller preselect the dropdown — used when
// someone arrives from a /templates/[slug] landing page (via
// /dashboard/documents/new?type=nda) so they don't have to re-pick the
// template they came here for.
export function AiDraftForm({
  initialDocumentType,
}: {
  initialDocumentType?: DraftDocumentType;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [documentType, setDocumentType] = useState<DraftDocumentType>(initialDocumentType ?? DOCUMENT_TYPES[0].id);
  const [language, setLanguage] = useState(() =>
    detectDraftLang(typeof navigator !== "undefined" ? navigator.language : undefined)
  );
  const [description, setDescription] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");

  // Both re-derive from `language` on every render, so switching the
  // document language updates the description placeholder immediately —
  // same "picked language" treatment the dropdown label already gets.
  const selectedPlaceholder = documentTypePlaceholder(documentType, language);

  async function handleGenerate() {
    // "generate_draft_started" (2026-08-05, direct ask) — no usage counter
    // existed on this tab at all before; same "fire on every real attempt"
    // philosophy as generate_quote_started/the upload-side events.
    track("generate_draft_started");
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/documents/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, description, language, disclaimerAccepted: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't generate a draft.");
      setDraftTitle(data.title);
      setDraftBody(data.body);
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
      const res = await fetch("/api/documents/draft/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          title: draftTitle,
          body: draftBody,
          disclaimerAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the document.");
      // No recipient pre-seeding (removed 2026-07-23) -- the sender presses
      // "Suggested fields" on the field editor themselves, same as any other
      // document; phase 2's name-match against frequent signers fills the
      // email once a detected party's name matches a saved contact.
      router.push(`/dashboard/documents/${data.id}`);
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : "Something went wrong.");
      setFinalizing(false);
    }
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {AI_DRAFT_DISCLAIMER}
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="draft-title">Document title</Label>
          <Input id="draft-title" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="draft-body">Draft text — review and edit before creating the document</Label>
          <textarea
            id="draft-body"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={18}
            className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>

        {finalizeError && <p className="text-sm text-red-600">{finalizeError}</p>}

        {/* Secondary actions (Regenerate, Start over) come first/left,
            Create document (primary) comes last/right and grows into the
            remaining space, matching magic-quote-form.tsx's review-step
            buttons — the eye lands on the primary CTA last, not first.
            Stacked full-width on mobile: with three buttons here (one more
            than Magic Quote's two), a single flex-wrap row wrapped
            unpredictably depending on label length -- "Creating…" fit all
            three on one row while "Create document" pushed "Start over"
            onto its own uneven row. sm: and up switches back to a single
            row with Create taking the remaining space. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={generating || finalizing}
            onClick={handleGenerate}
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={finalizing}
            onClick={() => {
              setStep("describe");
              setGenerateError("");
            }}
          >
            Start over
          </Button>
          <Button
            className="w-full sm:w-auto sm:flex-1"
            disabled={finalizing || !draftTitle.trim() || !draftBody.trim()}
            onClick={handleFinalize}
          >
            {finalizing ? "Creating…" : "Create document →"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="document-type">Document type</Label>
        <select
          id="document-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DraftDocumentType)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {documentTypeLabel(t.id, language)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="draft-language">Document language</Label>
        <select
          id="draft-language"
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
        <Label htmlFor="description">Describe what you need</Label>
        {/* Wrapper carries the yellow glow — it hops here from the "AI Drafter"
            tab once this mode is open. Textareas don't render ::after, so the
            ring lives on this div; `block` on the textarea removes the inline
            baseline gap so the ring hugs it. */}
        <div className="ai-comet rounded-md">
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={selectedPlaceholder}
            rows={4}
            className="block w-full rounded-md border border-slate-300 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {AI_DRAFT_DISCLAIMER}
      </p>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={disclaimerChecked}
          onChange={(e) => setDisclaimerChecked(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5"
        />
        {AI_DRAFT_CHECKBOX_LABEL}
      </label>

      {generateError && <p className="text-sm text-red-600">{generateError}</p>}

      <Button
        className="w-full"
        disabled={!disclaimerChecked || !description.trim() || generating}
        onClick={handleGenerate}
      >
        {generating ? "Generating draft…" : "Generate draft"}
      </Button>
    </div>
  );
}
