"use client";

import { useEffect, useState } from "react";

type TemplateSummary = { id: string; name: string; pageCount: number; fieldCount: number; partyCount: number; createdAt: string };

/** Templates tab in Console's sidebar (console-workspace.tsx) —
 *  TEMPLATE_BROWSE_SCOPE.md's Option A, 2026-08-02: clicking a template
 *  spawns a draft document via the existing `/api/templates/[id]/use`
 *  (same route the dashboard's own "Use template" button calls, unchanged)
 *  and opens the field editor on it, same as every other Console-to-editor
 *  link. Modeled directly on ConsoleHistorySidebar's fetch/render shape.
 *
 *  Deliberately does NOT try to avoid creating a draft on every click —
 *  see field-editor.tsx's auto-discard-on-Back-to-Console handling
 *  (consoleTemplatePreview prop) for how the litter this would otherwise
 *  leave behind gets cleaned up instead. */
export function ConsoleTemplatesList({
  activeConversationId,
}: {
  // Carried onto the editor link as &c=, so "Back to Console" (see
  // field-editor.tsx's consoleConversationId prop) reopens this exact
  // conversation instead of a blank one. Null is fine — a brand-new
  // session with nothing saved yet — the link just omits &c=, same
  // fallback console-chat.tsx's own reviewLink already has.
  activeConversationId: string | null;
}) {
  const [items, setItems] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/console/templates")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data.templates) ? data.templates : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function openTemplate(id: string) {
    if (openingId) return;
    setError("");
    setOpeningId(id);
    try {
      const res = await fetch(`/api/templates/${id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.id !== "string") {
        setError(data.error || "Couldn't open that template.");
        return;
      }
      // &consoleTemplatePreview=1 (2026-08-02) — tells the field editor
      // this draft exists only so someone could look at/tweak the
      // template's fields, not because they meant to create a new
      // document. See field-editor.tsx: if the user leaves via Back to
      // Console without saving or sending, the draft is discarded instead
      // of lingering in Documents.
      const href = `https://signedby.ai/dashboard/documents/${data.id}?from=console&consoleTemplatePreview=1${
        activeConversationId ? `&c=${activeConversationId}` : ""
      }`;
      // New tab, no opener — matches every other Console-to-editor link
      // (console-chat.tsx's m.link), so this tab's own conversation stays
      // alive in the background exactly the same way.
      window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn't open that template. Try again.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={openingId !== null}
          onClick={() => openTemplate(t.id)}
          className="rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-50"
        >
          <p className="truncate font-medium">{t.name}</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {openingId === t.id
              ? "Opening…"
              : `${t.fieldCount} field${t.fieldCount === 1 ? "" : "s"} · ${t.partyCount} signer${t.partyCount === 1 ? "" : "s"}`}
          </p>
        </button>
      ))}
      {!loading && items.length === 0 && (
        <p className="px-3 py-2 text-xs text-neutral-600">No templates yet — upload a document and save it as one to see it here.</p>
      )}
      {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
