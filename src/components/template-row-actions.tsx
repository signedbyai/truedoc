"use client";

import { useState } from "react";
import Link from "next/link";
import { BulkSendButton } from "@/components/bulk-send-button";
import { DeleteTemplateButton } from "@/components/delete-template-button";
import { CopyIdChip } from "@/components/copy-id-chip";
import { KebabIcon, MENU_ITEM_CLASS } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";

// Same kebab-menu pattern as DocumentRowActions (2026-08-20 row-actions
// consistency pass, "Option C") — Bulk send / Copy template ID / Delete
// collapse behind "⋯" instead of the old bottom-left text-link row, so
// this page finally shares Documents' interaction model instead of a
// visually lighter one.
export function TemplateRowActions({
  templateId,
  hasBulkSend,
  hasApiAccess,
}: {
  templateId: string;
  hasBulkSend: boolean;
  hasApiAccess: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Template actions"
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
            className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {hasBulkSend ? (
              <BulkSendButton templateId={templateId} asMenuItem onSelect={() => setOpen(false)} />
            ) : (
              <Link href="/pricing" className={cn(MENU_ITEM_CLASS, "text-slate-400 hover:bg-slate-50")}>
                Bulk send
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                  Team+
                </span>
              </Link>
            )}
            {hasApiAccess && <CopyIdChip value={templateId} label="Copy template ID" asMenuItem />}
            <div className="my-1 border-t border-slate-100" />
            <DeleteTemplateButton templateId={templateId} asMenuItem onSelect={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
