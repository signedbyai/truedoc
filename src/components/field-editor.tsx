"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

type Field = {
  id: string;
  type: FieldType;
  page: number;
  x: number; // 0-1, normalized to page width
  y: number; // 0-1, normalized to page height
  width: number; // 0-1
  height: number; // 0-1
  required: boolean;
};

const FIELD_TYPES: { type: FieldType; label: string; width: number; height: number; color: string }[] = [
  { type: "signature", label: "Signature", width: 0.22, height: 0.05, color: "border-blue-500 bg-blue-50 text-blue-700" },
  { type: "initials", label: "Initials", width: 0.08, height: 0.05, color: "border-purple-500 bg-purple-50 text-purple-700" },
  { type: "date", label: "Date", width: 0.14, height: 0.035, color: "border-amber-500 bg-amber-50 text-amber-700" },
  { type: "text", label: "Text", width: 0.2, height: 0.035, color: "border-slate-500 bg-slate-100 text-slate-700" },
  { type: "checkbox", label: "Checkbox", width: 0.03, height: 0.03, color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
];

function fieldStyle(type: FieldType) {
  return FIELD_TYPES.find((f) => f.type === type)!;
}

export function FieldEditor({ documentId, pageCount }: { documentId: string; pageCount: number }) {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<FieldType | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [pageCanvases, setPageCanvases] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Load existing fields.
  useEffect(() => {
    fetch(`/api/documents/${documentId}/fields`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.fields)) {
          setFields(
            data.fields.map((f: Omit<Field, "id"> & { id: string }) => ({ ...f, id: f.id }))
          );
        }
      })
      .catch(() => {});
  }, [documentId]);

  // Render PDF pages to images via pdfjs-dist.
  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const loadingTask = pdfjsLib.getDocument({ url: `/api/documents/${documentId}/file` });
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
  }, [documentId]);

  const placeField = useCallback(
    (page: number, clickXFraction: number, clickYFraction: number) => {
      if (!selectedTool) return;
      const def = fieldStyle(selectedTool);
      const x = Math.min(Math.max(clickXFraction - def.width / 2, 0), 1 - def.width);
      const y = Math.min(Math.max(clickYFraction - def.height / 2, 0), 1 - def.height);
      const newField: Field = {
        id: `new-${crypto.randomUUID()}`,
        type: selectedTool,
        page,
        x,
        y,
        width: def.width,
        height: def.height,
        required: true,
      };
      setFields((prev) => [...prev, newField]);
    },
    [selectedTool]
  );

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>, page: number) {
    if (!selectedTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    placeField(page, xFrac, yFrac);
  }

  function handleFieldMouseDown(e: React.MouseEvent, field: Field) {
    e.stopPropagation();
    dragState.current = {
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
    };

    function onMove(moveEvent: MouseEvent) {
      const drag = dragState.current;
      if (!drag) return;
      const container = pageRefs.current[field.page];
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - drag.startX) / rect.width;
      const dy = (moveEvent.clientY - drag.startY) / rect.height;
      setFields((prev) =>
        prev.map((f) =>
          f.id === drag.id
            ? {
                ...f,
                x: Math.min(Math.max(drag.origX + dx, 0), 1 - f.width),
                y: Math.min(Math.max(drag.origY + dy, 0), 1 - f.height),
              }
            : f
        )
      );
    }

    function onUp() {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/documents/${documentId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: fields.map(({ type, page, x, y, width, height, required }) => ({
            type,
            page,
            x,
            y,
            width,
            height,
            required,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("Saved.");
    } catch {
      setSaveMessage("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          {FIELD_TYPES.map((f) => (
            <button
              key={f.type}
              onClick={() => setSelectedTool(selectedTool === f.type ? null : f.type)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedTool === f.type ? f.color : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-sm text-slate-500">{saveMessage}</span>}
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save fields"}
          </Button>
        </div>
      </div>

      {selectedTool && (
        <p className="bg-slate-900 px-6 py-1.5 text-center text-xs text-white">
          Click anywhere on the document to place a {fieldStyle(selectedTool).label.toLowerCase()} field.
        </p>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-10">
        {loading && <p className="text-sm text-slate-500">Loading document…</p>}

        {pageCanvases.map(({ page, dataUrl, width, height }) => (
          <div
            key={page}
            ref={(el) => {
              pageRefs.current[page] = el;
            }}
            onClick={(e) => handlePageClick(e, page)}
            className="relative border border-slate-300 bg-white shadow-sm"
            style={{ width, height, cursor: selectedTool ? "crosshair" : "default", maxWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`Page ${page}`} className="pointer-events-none block h-full w-full select-none" />

            {fields
              .filter((f) => f.page === page)
              .map((f) => {
                const def = fieldStyle(f.type);
                return (
                  <div
                    key={f.id}
                    onMouseDown={(e) => handleFieldMouseDown(e, f)}
                    className={cn(
                      "group absolute flex cursor-move items-center justify-center rounded border-2 text-[10px] font-medium",
                      def.color
                    )}
                    style={{
                      left: `${f.x * 100}%`,
                      top: `${f.y * 100}%`,
                      width: `${f.width * 100}%`,
                      height: `${f.height * 100}%`,
                    }}
                  >
                    {def.label}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      className="absolute -right-2 -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        ))}

        {!loading && pageCanvases.length === 0 && (
          <p className="text-sm text-red-600">Couldn&apos;t load this document ({pageCount} expected pages).</p>
        )}
      </div>
    </div>
  );
}
