"use client";

import { useState } from "react";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { KebabIcon } from "@/components/ui/menu-item";

// Collapses the Duplicate/Delete row actions behind a "⋯" kebab menu so
// each row is a single line — title/meta and the status pill are what a
// sender scans for, not a pair of always-visible buttons. Same
// trigger+scrim+panel shape as field-editor.tsx's "More" menu, just scoped
// to one list row instead of a page header.
//
// 2026-08-20, row-actions consistency pass ("Option C" from the mockup
// discussion): chosen over raising Templates to this page's old button
// weight, or demoting this page to Templates' old text-link weight,
// because it's the only option that both grows density (more rows visible
// per screen, which matters most on mobile) and reuses the asMenuItem
// components' modal-confirm delete — a safer confirm than the inline red
// panel the plain button used.
export function DocumentRowActions({ documentId, isDraft }: { documentId: string; isDraft: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Document actions"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <KebabIcon />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            <DuplicateDocumentButton documentId={documentId} asMenuItem onSelect={() => setOpen(false)} />
            {isDraft && <DeleteDocumentButton documentId={documentId} asMenuItem onSelect={() => setOpen(false)} />}
          </div>
        </>
      )}
    </div>
  );
}
