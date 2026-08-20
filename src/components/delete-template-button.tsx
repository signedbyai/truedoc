"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MENU_ITEM_CLASS, TrashIcon } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";

export function DeleteTemplateButton({
  templateId,
  className,
  asMenuItem = false,
  onSelect,
}: {
  templateId: string;
  className?: string;
  // Renders as a full-width menu row and confirms in a modal dialog rather
  // than the inline expanding text row below — same reasoning as
  // DeleteDocumentButton's asMenuItem mode: a menu can be dismissed
  // mid-confirm, which is a poor way to run an irreversible action.
  // Used from TemplateRowActions' kebab menu (2026-08-20 row-actions
  // consistency pass).
  asMenuItem?: boolean;
  // Called once the interaction is DONE (delete succeeded, or the dialog
  // was cancelled/dismissed) — not on the initial trigger click. See
  // DeleteDocumentButton's identical comment: calling onSelect() on the
  // trigger click closes (unmounts) the parent kebab menu before this
  // component's own confirm modal ever renders, since the modal lives in
  // this same subtree. Found 2026-08-20 — this shipped broken.
  onSelect?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete this template.");
      }
      onSelect?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (asMenuItem) {
    return (
      <div className={className}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className={cn(MENU_ITEM_CLASS, "text-red-600 hover:bg-red-50")}
        >
          <TrashIcon />
          Delete template
        </button>
        {error && !confirming && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {confirming && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-template-title"
            onClick={() => {
              if (!loading) {
                setConfirming(false);
                onSelect?.();
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-template-title" className="text-base font-semibold text-slate-900">
                Delete this template?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                This permanently deletes the template. This can&apos;t be undone.
              </p>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                    onSelect?.();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                  {loading ? "Deleting…" : "Delete template"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs">
      {error && <span className="text-red-600">{error}</span>}
      <button onClick={() => setConfirming(false)} disabled={loading} className="text-slate-400 hover:text-slate-600">
        Cancel
      </button>
      <button onClick={handleDelete} disabled={loading} className="font-medium text-red-600 hover:text-red-700">
        {loading ? "Deleting…" : "Confirm delete"}
      </button>
    </span>
  );
}
