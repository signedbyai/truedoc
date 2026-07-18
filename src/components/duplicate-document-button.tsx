"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CopyIcon, MENU_ITEM_CLASS } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";

// Non-destructive, so unlike DeleteDocumentButton this has no confirm step —
// a single click duplicates and lands on the new draft's field editor.
// Works for a document in any status (draft/sent/completed/declined/
// voided), per POST /api/documents/[id]/duplicate.
export function DuplicateDocumentButton({
  documentId,
  className,
  asMenuItem = false,
  onSelect,
}: {
  documentId: string;
  className?: string;
  // Renders as a full-width menu row (icon + label, left-aligned, no border)
  // instead of an outline button. Opt-in: the outline button is still right
  // for the documents list and the document detail page, where this sits in a
  // row of peer buttons rather than inside a menu.
  asMenuItem?: boolean;
  // Lets the parent close its menu when this row is chosen.
  onSelect?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't duplicate this document.");
      router.push(`/dashboard/documents/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={(e) => {
          onSelect?.();
          handleDuplicate(e);
        }}
        disabled={loading}
        className={
          asMenuItem
            ? cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")
            : cn(buttonVariants({ variant: "outline", size: "sm" }))
        }
      >
        {asMenuItem && <CopyIcon />}
        {loading ? "Duplicating…" : "Duplicate"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
