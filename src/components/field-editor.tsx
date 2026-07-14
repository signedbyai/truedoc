"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { findFreePosition } from "@/lib/field-geometry";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { FIELD_TYPES, fieldDef, type FieldType } from "@/lib/field-types";

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
  // Set only on fields seeded from a template, before real recipients exist.
  // 0-based "recipient slot" — auto-bound to a real signerId as recipients
  // are added, in order. Meaningless once signerId is set.
  templateRole: number | null;
  // Client-only, never sent to the server: true for an AI-suggested field
  // the sender hasn't confirmed yet. Cleared (turning it into a normal
  // field) by clicking or dragging it; removed entirely by its "x" button,
  // same as any other field. See persist() — suggested fields are filtered
  // out of every save, so an unconfirmed suggestion can never reach the DB.
  suggested?: boolean;
  // Client-only: true only when this suggested field is the generic
  // top-right fallback shown because the document couldn't actually be
  // analyzed (no extractable text, or the AI call itself failed) — not a
  // real suggestion based on the document's content. Rendered with
  // different, more honest copy than a real suggestion (see the "Suggested"
  // vs "Placeholder" tag below) so the sender isn't misled into thinking
  // this reflects an actual read of the document.
  placeholder?: boolean;
};

type Recipient = {
  id: string;
  name: string;
  email: string;
  order_index: number;
};

// Cycled by recipient index so each signer's fields are visually distinct.
const RECIPIENT_COLORS = [
  { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
];

function recipientColor(recipients: Recipient[], signerId: string | null) {
  if (!signerId) return { border: "border-slate-400", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  const idx = recipients.findIndex((r) => r.id === signerId);
  return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length] ?? RECIPIENT_COLORS[0];
}

export function FieldEditor({
  documentId,
  pageCount,
  hasPaymentCollection,
  hasDocGate,
  hasTemplates,
  autoSuggestOnUpload,
  initialPaymentLinkUrl,
  initialPaymentLabel,
  initialDocgateUrl,
  initialDocgateLabel,
}: {
  documentId: string;
  pageCount: number;
  hasPaymentCollection: boolean;
  hasDocGate: boolean;
  hasTemplates: boolean;
  // Org-wide preference (dashboard/settings), off by default — see
  // src/app/api/org/auto-suggest/route.ts. Only controls whether
  // suggestions run automatically on a brand-new document; the manual
  // "Suggest fields" button below always works regardless.
  autoSuggestOnUpload: boolean;
  initialPaymentLinkUrl: string | null;
  initialPaymentLabel: string | null;
  initialDocgateUrl: string | null;
  initialDocgateLabel: string | null;
}) {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<FieldType | null>(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(initialPaymentLinkUrl || "");
  const [paymentLabel, setPaymentLabel] = useState(initialPaymentLabel || "");
  const [showPaymentEditor, setShowPaymentEditor] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [docgateUrl, setDocgateUrl] = useState(initialDocgateUrl || "");
  const [docgateLabel, setDocgateLabel] = useState(initialDocgateLabel || "");
  const [showDocgateEditor, setShowDocgateEditor] = useState(false);
  const [savingDocgate, setSavingDocgate] = useState(false);
  const [docgateError, setDocgateError] = useState("");
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
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  // First-time-sender guidance — only relevant before any fields exist, so
  // it naturally disappears for every document after the first one, and
  // won't flash for a returning document that already has fields once the
  // initial fetch below resolves.
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  // Guards the auto-suggest effect below to a single attempt per mount —
  // without this, any state change that re-runs the effect (e.g. the
  // suggestions themselves arriving) would re-trigger it in a loop.
  const autoSuggestAttempted = useRef(false);

  const confirmedFields = fields.filter((f) => !f.suggested);

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
            fieldsData.fields.map(
              (f: Omit<Field, "signerId" | "templateRole"> & { signer_id: string | null; template_role: number | null }) => ({
                ...f,
                signerId: f.signer_id,
                templateRole: f.template_role,
              })
            )
          );
        }
      })
      .catch(() => {})
      .finally(() => setFieldsLoaded(true));
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

  // Fetches AI field-placement suggestions and merges them into local
  // state as unconfirmed ("suggested") fields — never written to the
  // server until the sender accepts one. Runs automatically once for a
  // brand-new document (see the effect below) and can also be re-run any
  // time via the toolbar's "Suggest fields" button or "Re-suggest"/
  // "Try again" in the banners below. `replaceExisting` is used by
  // "Suggest fields" and "Re-suggest" to swap out only the still-
  // unconfirmed suggestions (leaving anything the sender already confirmed
  // untouched); the initial auto-run and "Try again" after an error don't
  // need it since there's nothing to replace yet.
  const runSuggestFields = useCallback(
    async (replaceExisting = false) => {
      setSuggesting(true);
      setSuggestError("");
      try {
        const res = await fetch(`/api/documents/${documentId}/suggest-fields`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't generate suggestions.");

        const suggestions: { page: number; type: FieldType; x: number; y: number; width: number; height: number; role: number | null }[] =
          Array.isArray(data.suggestions) ? data.suggestions : [];
        // True only when the document couldn't actually be analyzed (no
        // extractable text, or the AI call itself failed) — see
        // Field.placeholder and suggest-fields.ts's SuggestFieldsResult.
        const unreadable = Boolean(data.unreadable);

        setFields((prev) => {
          // If the sender started placing fields manually while this
          // request was in flight, don't clobber their work with stale
          // suggestions computed against an empty editor.
          if (!replaceExisting && prev.some((f) => !f.suggested)) return prev;

          const base = replaceExisting ? prev.filter((f) => !f.suggested) : prev;
          const newSuggested: Field[] = suggestions.map((s) => ({
            id: `sugg-${crypto.randomUUID()}`,
            type: s.type,
            page: s.page,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            required: true,
            signerId: null,
            templateRole: s.role,
            suggested: true,
            placeholder: unreadable,
          }));
          return [...base, ...newSuggested];
        });
      } catch (err) {
        setSuggestError(err instanceof Error ? err.message : "Couldn't generate suggestions.");
      } finally {
        setSuggesting(false);
      }
    },
    [documentId]
  );

  // Auto-run once for a completely untouched, brand-new document — not for
  // one that already has fields (from a template, a prior session, or an
  // earlier suggestion run) or recipients (a sender who's already deep into
  // editing doesn't want fields appearing out from under them). Off by
  // default now (autoSuggestOnUpload, an org-level Settings preference) —
  // going straight into AI-suggested-field mode before a sender has even
  // looked at the document made some senders uncomfortable, so this only
  // runs for orgs that have explicitly opted in. The manual "Suggest
  // fields" button works regardless of this setting either way.
  useEffect(() => {
    if (!autoSuggestOnUpload) return;
    if (!fieldsLoaded || autoSuggestAttempted.current) return;
    if (fields.length > 0 || recipients.length > 0) return;
    autoSuggestAttempted.current = true;
    // Deferred a tick — runSuggestFields' first line is a setState call,
    // and calling that synchronously from within an effect body trips
    // react-hooks/set-state-in-effect. Same deferral pattern used
    // elsewhere in this file/signing-view.tsx for the same reason.
    Promise.resolve().then(() => runSuggestFields());
  }, [autoSuggestOnUpload, fieldsLoaded, fields.length, recipients.length, runSuggestFields]);

  function addRecipient() {
    const email = newEmail.trim();
    if (!email) return;
    const roleClaimed = recipients.length;
    const recipient: Recipient = {
      id: `new-${crypto.randomUUID()}`,
      name: newName.trim(),
      email,
      order_index: roleClaimed,
    };
    setRecipients((prev) => [...prev, recipient]);
    setActiveRecipientId(recipient.id);
    setNewName("");
    setNewEmail("");
    setShowAddRecipient(false);

    // Claim any template-seeded fields waiting for this recipient slot —
    // roles are numbered in the order recipients were added, both when a
    // template was saved and here when it's reused.
    setFields((prev) =>
      prev.map((f) =>
        f.signerId === null && f.templateRole === roleClaimed
          ? { ...f, signerId: recipient.id, templateRole: null }
          : f
      )
    );
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
      setFields((prev) => {
        const free = findFreePosition(page, x, y, def.width, def.height, prev);
        const newField: Field = {
          id: `new-${crypto.randomUUID()}`,
          type: selectedTool,
          page,
          x: free.x,
          y: free.y,
          width: def.width,
          height: def.height,
          required: true,
          signerId: activeRecipientId,
          templateRole: null,
        };
        return [...prev, newField];
      });
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

  // Confirming a suggestion should mean the same thing everywhere: clear
  // `suggested`, snapping away from anything it now overlaps. Used by all
  // three ways to confirm one — tapping it in place, dragging it, and the
  // explicit ✓ button — so they can never disagree with each other. For a
  // drag, `current.x/y` is already the live-dragged position (onMove keeps
  // it updated in state as the pointer moves), so this reads whatever the
  // field's current position is rather than needing it passed in.
  const confirmField = useCallback((id: string) => {
    setFields((prev) => {
      const current = prev.find((f) => f.id === id);
      if (!current) return prev;
      const others = prev.filter((f) => f.id !== id);
      const free = findFreePosition(current.page, current.x, current.y, current.width, current.height, others);
      return prev.map((f) => (f.id === id ? { ...f, x: free.x, y: free.y, suggested: false } : f));
    });
  }, []);

  // Pointer Events (not mouse-only) so this works for touch/iOS drags too,
  // not just a mouse. touch-none on the field div (below) stops the browser
  // from treating the drag as a page-scroll gesture.
  function handleFieldPointerDown(e: React.PointerEvent, field: Field) {
    e.stopPropagation();
    dragState.current = {
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
    };

    function onMove(moveEvent: PointerEvent) {
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
      const draggedId = dragState.current?.id;
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!draggedId) return;

      // Any pointer interaction with a suggested field — a tap-in-place or
      // a drag to nudge it — counts as the sender reviewing and accepting
      // it, so this also clears `suggested` here rather than needing a
      // separate confirm control. Goes through the same confirmField() as
      // the ✓ button and plain taps (position was already applied live by
      // onMove for an actual drag), so all three ways to confirm a
      // suggestion end up in an identical end state.
      confirmField(draggedId);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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

    // Unconfirmed AI suggestions are never persisted — "nothing is final
    // until the sender confirms it" (see the Field.suggested comment).
    const currentFields = fields
      .filter((f) => !f.suggested)
      .map((f) => (f.signerId && !savedRecipients.some((r) => r.id === f.signerId) ? { ...f, signerId: null } : f));

    const res = await fetch(`/api/documents/${documentId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: currentFields.map(({ type, page, x, y, width, height, required, signerId, templateRole }) => ({
          type,
          page,
          x,
          y,
          width,
          height,
          required,
          signer_id: signerId,
          template_role: templateRole,
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
    if (confirmedFields.length === 0) {
      setStatusMessage("Place at least one field before sending.");
      return;
    }
    // A confirmed field with no signer is only safe to send when there's a
    // single recipient and the field was never tagged for a specific party
    // (see visibleFieldsForSigner) — that's the common "didn't bother
    // selecting the recipient chip" case, and it still reaches that one
    // recipient fine. Anything else (a "Party 2"-tagged field nobody ever
    // claimed, or an unassigned field when there's more than one recipient)
    // would otherwise either vanish for every signer or, worse, bleed onto
    // the wrong one — block the send and say so instead of shipping that.
    const orphanedFields = confirmedFields.filter(
      (f) => f.signerId === null && (f.templateRole !== null || recipients.length > 1)
    );
    if (orphanedFields.length > 0) {
      setStatusMessage(
        `${orphanedFields.length} field${orphanedFields.length === 1 ? " isn't" : "s aren't"} assigned to a ` +
          `recipient — remove ${orphanedFields.length === 1 ? "it" : "them"} and re-place ${
            orphanedFields.length === 1 ? "it" : "them"
          } with a recipient selected above (or add the missing recipient) before sending.`
      );
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

  async function handleSaveAsTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    setTemplateError("");
    const ok = await persist(); // make sure the DB has the latest fields/recipients before reading them back
    if (!ok) {
      setTemplateError("Couldn't save — try again.");
      setSavingTemplate(false);
      return;
    }
    try {
      const res = await fetch(`/api/documents/${documentId}/save-as-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save as a template.");
      }
      setShowSaveTemplateModal(false);
      setTemplateName("");
      setStatusMessage("Saved as template.");
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function savePayment() {
    setSavingPayment(true);
    setPaymentError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_link_url: paymentLinkUrl.trim(), payment_label: paymentLabel.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the payment link.");
      setShowPaymentEditor(false);
      setStatusMessage(paymentLinkUrl.trim() ? "Payment link saved." : "Payment link removed.");
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function saveDocgate() {
    setSavingDocgate(true);
    setDocgateError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/docgate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docgate_url: docgateUrl.trim(), docgate_label: docgateLabel.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the DocGate link.");
      setShowDocgateEditor(false);
      setStatusMessage(docgateUrl.trim() ? "DocGate link saved." : "DocGate link removed.");
    } catch (err) {
      setDocgateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingDocgate(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {FIELD_TYPES.map((f) => (
              <button
                key={f.type}
                onClick={() => setSelectedTool(selectedTool === f.type ? null : f.type)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedTool === f.type
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  // Draws the eye straight to the first thing a brand-new
                  // document needs, in case the dismissible banner below
                  // gets skipped past — same pulse the signer side already
                  // uses for "the next thing you need to do".
                  f.type === "signature" &&
                    fieldsLoaded &&
                    confirmedFields.length === 0 &&
                    !selectedTool &&
                    "next-field-highlight"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {statusMessage && <span className="text-sm text-slate-500">{statusMessage}</span>}
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button variant="outline" onClick={() => runSuggestFields(true)} disabled={suggesting}>
              {suggesting ? "Suggesting…" : "Suggest fields"}
            </Button>
            <DuplicateDocumentButton documentId={documentId} />
            <DeleteDocumentButton documentId={documentId} redirectTo="/dashboard/documents" />
            {hasTemplates ? (
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateError("");
                  setShowSaveTemplateModal(true);
                }}
                disabled={saving || sending || confirmedFields.length === 0}
              >
                Save as template
              </Button>
            ) : (
              <a href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
                Save as template (Starter+)
              </a>
            )}
            <Button onClick={handleSend} disabled={saving || sending}>
              {sending ? "Sending…" : "Send for signature"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-6">
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

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-2.5">
          <span className="text-xs font-medium text-slate-500">Payment:</span>
          {!hasPaymentCollection ? (
            <a href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
              Request payment on signing (Business)
            </a>
          ) : showPaymentEditor ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                value={paymentLabel}
                onChange={(e) => setPaymentLabel(e.target.value)}
                placeholder="Label, e.g. $500 deposit"
                className="h-7 w-40 text-xs"
              />
              <Input
                value={paymentLinkUrl}
                onChange={(e) => setPaymentLinkUrl(e.target.value)}
                placeholder="https://buy.stripe.com/..."
                className="h-7 w-56 text-xs"
              />
              <button
                onClick={savePayment}
                disabled={savingPayment}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {savingPayment ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowPaymentEditor(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
              {paymentError && <span className="text-xs text-red-600">{paymentError}</span>}
            </div>
          ) : paymentLinkUrl ? (
            <button
              onClick={() => setShowPaymentEditor(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {paymentLabel || "Payment link set"}
            </button>
          ) : (
            <button
              onClick={() => setShowPaymentEditor(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add payment link
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-2.5">
          <span className="text-xs font-medium text-slate-500">Document gate:</span>
          {!hasDocGate ? (
            <a href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
              Gate a linked asset behind signing (Business)
            </a>
          ) : showDocgateEditor ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  value={docgateLabel}
                  onChange={(e) => setDocgateLabel(e.target.value)}
                  placeholder="Label, e.g. Access your welcome kit"
                  className="h-7 w-52 text-xs"
                />
                <Input
                  value={docgateUrl}
                  onChange={(e) => setDocgateUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="h-7 w-56 text-xs"
                />
                <button
                  onClick={saveDocgate}
                  disabled={savingDocgate}
                  className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {savingDocgate ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setShowDocgateEditor(false)} className="text-xs text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
                {docgateError && <span className="text-xs text-red-600">{docgateError}</span>}
              </div>
              <p className="text-xs text-slate-400">
                Released to every signer once everyone has signed. SignedBy doesn&apos;t manage sharing permissions on
                the linked file — double-check it&apos;s shared correctly before sending.
              </p>
            </div>
          ) : docgateUrl ? (
            <button
              onClick={() => setShowDocgateEditor(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {docgateLabel || "Gate link set"}
            </button>
          ) : (
            <button
              onClick={() => setShowDocgateEditor(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add gate link
            </button>
          )}
        </div>
      </div>

      {showIntro && fieldsLoaded && confirmedFields.length === 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-6 py-2.5">
          <p className="text-xs text-blue-900">
            Pick a field type above and click anywhere on the document to place it yourself, or press{" "}
            <strong>Suggest fields</strong> to scan the document and suggest field placements for you to review. Add
            recipients below, then send when you&apos;re ready.
          </p>
          <button
            onClick={() => setShowIntro(false)}
            className="whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Got it
          </button>
        </div>
      )}

      {selectedTool && (
        <p className="bg-slate-900 px-6 py-1.5 text-center text-xs text-white">
          Click anywhere on the document to place a {fieldDef(selectedTool).label.toLowerCase()} field
          {activeRecipientId ? " for the selected recipient." : " (unassigned — select a recipient chip above to assign it)."}
        </p>
      )}

      {suggesting && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-6 py-2.5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-xs text-amber-900">Looking for signature, date, and initials spots in this document…</p>
        </div>
      )}

      {!suggesting && suggestError && (
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-6 py-2.5">
          <p className="text-xs text-red-700">{suggestError}</p>
          <button
            onClick={() => runSuggestFields()}
            className="whitespace-nowrap text-xs font-medium text-red-700 hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {!suggesting && fields.some((f) => f.suggested && f.placeholder) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-2.5">
          <p className="text-xs text-amber-900">
            This document doesn&apos;t appear to have readable text (it may be a scanned image), so we couldn&apos;t
            detect field positions automatically. We&apos;ve placed one starting field — move it, or add your own.
          </p>
          <button
            onClick={() => setFields((prev) => prev.filter((f) => !f.suggested))}
            className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {!suggesting && fields.some((f) => f.suggested && !f.placeholder) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-2.5">
          <p className="text-xs text-amber-900">
            {fields.filter((f) => f.suggested && !f.placeholder).length} suggested field
            {fields.filter((f) => f.suggested && !f.placeholder).length === 1 ? "" : "s"} — dashed outline. Click or
            drag one to confirm it, or use its × to remove it.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => runSuggestFields(true)}
              className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
            >
              Re-suggest
            </button>
            <button
              onClick={() => setFields((prev) => prev.filter((f) => !f.suggested))}
              className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
            >
              Clear suggestions
            </button>
          </div>
        </div>
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
            className="relative w-full border border-slate-300 bg-white shadow-sm"
            // Sized by aspect-ratio (not a fixed height alongside maxWidth:
            // 100%) so the page scales down correctly on any viewport
            // narrower than its native rendered width — e.g. a phone screen
            // — instead of the width shrinking to fit while the height stays
            // pinned at its full-size pixel value, which visibly squished/
            // stretched the page (and every field box on it) on narrow
            // screens. maxWidth caps it at the PDF's native rendered size so
            // it never upscales past that and looks blurry on a wide screen.
            style={{
              aspectRatio: `${width} / ${height}`,
              maxWidth: `${width}px`,
              cursor: selectedTool ? "crosshair" : "default",
            }}
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
                    onPointerDown={(e) => handleFieldPointerDown(e, f)}
                    className={cn(
                      "group absolute flex touch-none cursor-move items-center justify-center rounded border-2 text-[10px] font-medium",
                      f.suggested
                        ? "border-dashed border-amber-500 bg-amber-50/80 text-amber-800"
                        : cn(color.border, color.bg, color.text)
                    )}
                    style={{
                      left: `${f.x * 100}%`,
                      top: `${f.y * 100}%`,
                      width: `${f.width * 100}%`,
                      height: `${f.height * 100}%`,
                    }}
                  >
                    {f.suggested && (
                      <span className="absolute -top-4 left-0 whitespace-nowrap rounded bg-amber-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                        {f.placeholder ? "Placeholder" : "Suggested"}
                      </span>
                    )}
                    {f.signerId === null && f.templateRole !== null
                      ? `${def.label} · Party ${f.templateRole + 1}`
                      : def.label}
                    {f.suggested && (
                      <button
                        // Stops the pointerdown here too, not just the click below —
                        // otherwise it bubbles up to the field div's own
                        // onPointerDown first (see handleFieldPointerDown) and starts
                        // a drag/confirm cycle of its own at the same time as this
                        // button's click, racing against it. That race was the cause
                        // of confirming sometimes shifting the field to an unexpected
                        // spot, and removing sometimes silently only confirming
                        // instead of deleting.
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmField(f.id);
                        }}
                        aria-label={`Confirm ${def.label.toLowerCase()} field`}
                        // Larger than the plain h-5 w-5 icon size on touch-sized
                        // viewports (still 20px on sm+/mouse) — a 20px target
                        // next to another 20px target a few pixels away is a
                        // rough tap on a phone, especially with two fields
                        // placed close together.
                        className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-sm sm:-left-2.5 sm:-top-2.5 sm:h-5 sm:w-5"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      aria-label={`Remove ${def.label.toLowerCase()} field`}
                      className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm sm:-right-2.5 sm:-top-2.5 sm:h-5 sm:w-5"
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

      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Save as template</p>
            <p className="mt-1 text-xs text-slate-500">
              Field positions and recipient roles are saved (e.g. &quot;Signer 1&quot;, &quot;Signer 2&quot;) — the
              actual recipients you pick each time you use this template.
            </p>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="mt-3"
              onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
            />
            {templateError && <p className="mt-2 text-sm text-red-600">{templateError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                disabled={savingTemplate}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? "Saving…" : "Save template"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
