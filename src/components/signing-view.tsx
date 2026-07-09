"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

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

export function SigningView({
  token,
  documentTitle,
  pageCount,
  signerName,
  fields: initialFields,
}: {
  token: string;
  documentTitle: string;
  pageCount: number;
  signerName: string | null;
  fields: Field[];
}) {
  const [pageCanvases, setPageCanvases] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialFields.map((f) => [f.id, f.value || ""]))
  );
  const [consent, setConsent] = useState(false);
  const [signaturePadFor, setSignaturePadFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const padRef = useRef<SignatureCanvas | null>(null);

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

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function saveSignature() {
    if (!signaturePadFor || !padRef.current) return;
    if (padRef.current.isEmpty()) {
      setSignaturePadFor(null);
      return;
    }
    const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
    setValue(signaturePadFor, dataUrl);
    setSignaturePadFor(null);
  }

  async function handleSubmit() {
    if (!consent) {
      setError("Please check the consent box before signing.");
      return;
    }
    const missing = initialFields.filter((f) => f.required && !values[f.id]?.trim());
    if (missing.length > 0) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Signed</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks{signerName ? `, ${signerName}` : ""} — your signature has been recorded. You&apos;ll receive a copy once
            everyone has signed.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">{documentTitle}</h1>
          {signerName && <p className="text-xs text-slate-500">Signing as {signerName}</p>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Sign & submit"}
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-2.5 text-xs text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-3.5 w-3.5" />
        I agree to sign this document electronically and understand it carries the same legal weight as a handwritten
        signature.
      </label>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-10">
        {loading && <p className="text-sm text-slate-500">Loading document…</p>}

        {pageCanvases.map(({ page, dataUrl, width, height }) => (
          <div key={page} className="relative border border-slate-300 bg-white shadow-sm" style={{ width, height, maxWidth: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`Page ${page}`} className="pointer-events-none block h-full w-full select-none" />

            {initialFields
              .filter((f) => f.page === page)
              .map((f) => (
                <div
                  key={f.id}
                  className="absolute"
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    width: `${f.width * 100}%`,
                    height: `${f.height * 100}%`,
                  }}
                >
                  <FieldInput field={f} value={values[f.id] || ""} onChange={(v) => setValue(f.id, v)} onOpenPad={() => setSignaturePadFor(f.id)} />
                </div>
              ))}
          </div>
        ))}

        {!loading && pageCanvases.length === 0 && (
          <p className="text-sm text-red-600">Couldn&apos;t load this document ({pageCount} expected pages).</p>
        )}
      </div>

      {signaturePadFor && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <p className="mb-2 text-sm font-medium text-slate-700">Draw your signature</p>
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
                <Button onClick={saveSignature}>Use this signature</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onOpenPad,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onOpenPad: () => void;
}) {
  const base = "h-full w-full rounded border-2 text-[10px] font-medium";

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
