"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_TYPES,
  AI_DRAFT_DISCLAIMER,
  AI_DRAFT_CHECKBOX_LABEL,
  type DraftDocumentType,
} from "@/lib/ai-draft-types";

// Two-step flow, mirroring the "nothing is final until confirmed" pattern
// used elsewhere in this app (AI field-placement suggestions): generating a
// draft never touches the database — the sender reviews and can edit the
// full text before anything becomes a real document. See
// src/lib/draft-document.ts and the two API routes this calls into.
export function AiDraftForm() {
  const router = useRouter();
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [documentType, setDocumentType] = useState<DraftDocumentType>(DOCUMENT_TYPES[0].id);
  const [description, setDescription] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");

  const selectedType = DOCUMENT_TYPES.find((t) => t.id === documentType) ?? DOCUMENT_TYPES[0];

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/documents/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, description, disclaimerAccepted: true }),
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

        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            disabled={finalizing || !draftTitle.trim() || !draftBody.trim()}
            onClick={handleFinalize}
          >
            {finalizing ? "Creating…" : "Create document"}
          </Button>
          <Button
            variant="outline"
            disabled={generating || finalizing}
            onClick={handleGenerate}
          >
            {generating ? "Regenerating…" : "Regenerate"}
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
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Describe what you need</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={selectedType.placeholder}
          rows={4}
          className="w-full rounded-md border border-slate-300 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        />
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
