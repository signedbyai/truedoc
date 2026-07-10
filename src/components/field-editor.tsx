"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  signerId: string | null;
};

type Recipient = {
  id: string;
  name: string;
  email: string;
  order_index: number;
};

const FIELD_TYPES: { type: FieldType; label: string; width: number; height: number }[] = [
  { type: "signature", label: "Signature", width: 0.22, height: 0.05 },
  { type: "initials", label: "Initials", width: 0.08, height: 0.05 },
  { type: "date", label: "Date", width: 0.14, height: 0.035 },
  { type: "text", label: "Text", width: 0.2, height: 0.035 },
  { type: "checkbox", label: "Checkbox", width: 0.03, height: 0.03 },
];

// Cycled by recipient index so each signer's fields are visually distinct.
const RECIPIENT_COLORS = [
  { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
];

function fieldDef(type: FieldType) {
  return FIELD_TYPES.find((f) => f.type === type)!;
}

function recipientColor(recipients: Recipient[], signerId: string | null) {
  if (!signerId) return { border: "border-slate-400", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  const idx = recipients.findIndex((r) => r.id === signerId);
  return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length] ?? RECIPIENT_COLORS[0];
}

export function FieldEditor({ documentId, pageCount }: { documentId: string; pageCount: number }) {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<FieldType | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pageCanvases, setPageCanvases] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Load existing recipients + fields.
  useEffect(() => {
    Promise.all([
      fetch(`/api/documents/${documentId}/signers`).then((r) => r.json()),
      fetch(`/api/documents/${documentId}/fields`).then((r) => r.json()),
    ])
      .then(([signersData, fieldsData]) => {
        if (Array.isArray(signersData.signers)) {
          const loaded: Recipient[] = signersData.signers.map(
            (s: { id: string; name: string | null; email: string; order_index: number }) => ({
              id: s.id,
              name: s.name || "",
              email: s.email,
              order_index: s.order_index,
            })
          );
          setRecipients(loaded);
          if (loaded.length > 0) setActiveRecipientId(loaded[0].id);
        }
        if (Array.isArray(fieldsData.fields)) {
          setFields(
            fieldsData.fields.map((f: Omit<Field, "signerId"> & { signer_id: string | null }) => ({
              ...f,
              signerId: f.signer_id,
            }))
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

  function addRecipient() {
    const email = newEmail.trim();
    if (!email) return;
    const recipient: Recipient = {
      id: `new-${crypto.randomUUID()}`,
      name: newName.trim(),
      email,
      order_index: recipients.length,
    };
    setRecipients((prev) => [...prev, recipient]);
    setActiveRecipientId(recipient.id);
    setNewName("");
    setNewEmail("");
    setShowAddRecipient(false);
  }

  function removeRecipient(id: string) {
    setRecipients((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order_index: i })));
    setFields((prev) => prev.map((f) => (f.signerId === id ? { ...f, signerId: null } : f)));
    setActiveRecipientId((prev) => (prev === id ? null : prev));
  }

  const placeField = useCallback(
    (page: number, clickXFraction: number, clickYFraction: number) => {
      if (!selectedTool) return;
      const def = fieldDef(selectedTool);
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
        signerId: activeRecipientId,
      };
      setFields((prev) => [...prev, newField]);
    },
    [selectedTool, activeRecipientId]
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

  // Saves recipients first (so we have real signer ids), remaps fields to
  // point at those ids, then saves fields. Returns false on failure.
  async function persist(): Promise<boolean> {
    let savedRecipients = recipients;

    if (recipients.length > 0) {
      const res = await fetch(`/api/documents/${documentId}/signers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signers: recipients.map((r) => ({ name: r.name || null, email: r.email, order_index: r.order_index })),
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const returned: { id: string; email: string }[] = data.signers ?? [];

      // Match by array position (single batch insert preserves order); fall
      // back to email match if that ever isn't true.
      const oldToNew = new Map<string, string>();
      recipients.forEach((r, i) => {
        const match = returned[i]?.email === r.email ? returned[i] : returned.find((x) => x.email === r.email);
        if (match) oldToNew.set(r.id, match.id);
      });

      savedRecipients = recipients.map((r) => ({ ...r, id: oldToNew.get(r.id) ?? r.id }));
      setRecipients(savedRecipients);
      setActiveRecipientId((prev) => (prev ? oldToNew.get(prev) ?? prev : prev));
      setFields((prev) => prev.map((f) => (f.signerId ? { ...f, signerId: oldToNew.get(f.signerId) ?? f.signerId } : f)));
    }

    const currentFields = fields.map((f) =>
      f.signerId && !savedRecipients.some((r) => r.id === f.signerId) ? { ...f, signerId: null } : f
    );

    const res = await fetch(`/api/documents/${documentId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: currentFields.map(({ type, page, x, y, width, height, required, signerId }) => ({
          type,
          page,
          x,
          y,
          width,
          height,
          required,
          signer_id: signerId,
        })),
      }),
    });

    return res.ok;
  }

  async function handleSaveDraft() {
    setSaving(true);
    setStatusMessage("");
    const ok = await persist();
    setStatusMessage(ok ? "Saved." : "Couldn't save — try again.");
    setSaving(false);
  }

  async function handleSend() {
    if (recipients.length === 0) {
      setStatusMessage("Add at least one recipient before sending.");
      return;
    }
    if (fields.length === 0) {
      setStatusMessage("Place at least one field before sending.");
      return;
    }
    setSending(true);
    setStatusMessage("");
    const ok = await persist();
    if (!ok) {
      setStatusMessage("Couldn't save — try again.");
      setSending(false);
      return;
    }
    const res = await fetch(`/api/documents/${documentId}/send`, { method: "POST" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      setStatusMessage(data.error || "Couldn't send — try again.");
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {FIELD_TYPES.map((f) => (
              <button
                key={f.type}
                onClick={() => setSelectedTool(selectedTool === f.type ? null : f.type)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedTool === f.type
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {statusMessage && <span className="text-sm text-slate-500">{statusMessage}</span>}
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button onClick={handleSend} disabled={saving || sending}>
              {sending ? "Sending…" : "Send for signature"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-2.5">
          <span className="text-xs font-medium text-slate-500">Recipients:</span>
          {recipients.map((r, i) => {
            const color = RECIPIENT_COLORS[i % RECIPIENT_COLORS.length];
            return (
              <button
                key={r.id}
                onClick={() => setActiveRecipientId(r.id)}
                className={cn(
                  "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  activeRecipientId === r.id
                    ? `${color.border} ${color.bg} ${color.text}`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", color.dot)} />
                {r.name || r.email}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecipient(r.id);
                  }}
                  className="ml-1 hidden text-slate-400 hover:text-red-500 group-hover:inline"
                >
                  ×
                </span>
              </button>
            );
          })}

          {showAddRecipient ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                className="h-7 w-32 text-xs"
              />
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="h-7 w-44 text-xs"
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <button onClick={addRecipient} className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                Add
              </button>
              <button onClick={() => setShowAddRecipient(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRecipient(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add recipient
            </button>
          )}
        </div>
      </div>

      {selectedTool && (
        <p className="bg-slate-900 px-6 py-1.5 text-center text-xs text-white">
          Click anywhere on the document to place a {fieldDef(selectedTool).label.toLowerCase()} field
          {activeRecipientId ? " for the selected recipient." : " (unassigned — select a recipient chip above to assign it)."}
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
                const def = fieldDef(f.type);
                const color = recipientColor(recipients, f.signerId);
                return (
                  <div
                    key={f.id}
                    onMouseDown={(e) => handleFieldMouseDown(e, f)}
                    className={cn(
                      "group absolute flex cursor-move items-center justify-center rounded border-2 text-[10px] font-medium",
                      color.border,
                      color.bg,
                      color.text
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
                      aria-label={`Remove ${def.label.toLowerCase()} field`}
                      className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm"
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
