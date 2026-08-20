"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MailIcon, MENU_ITEM_CLASS } from "@/components/ui/menu-item";
import { cn } from "@/lib/utils";
import { parseRecipients } from "@/lib/parse-recipients";

export function BulkSendButton({
  templateId,
  asMenuItem = false,
  onSelect,
}: {
  templateId: string;
  // Renders the trigger as a full-width menu row instead of a text link —
  // the recipient form below is unchanged either way, it's still the same
  // modal (2026-08-20 row-actions consistency pass, used from
  // TemplateRowActions' kebab menu).
  asMenuItem?: boolean;
  // Called once the bulk-send modal is actually dismissed (cancelled, or
  // closed after sending) — not on the initial trigger click. Calling it
  // there closed the parent kebab menu immediately, which unmounts this
  // component (and the modal below, which lives in the same subtree)
  // before it ever renders. Found 2026-08-20 — this shipped broken.
  onSelect?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  // Non-blocking — every document here already sent regardless (bulk-send
  // has no per-recipient confirm step to pause on). Same popover shape as
  // the frequent-signers/signer-correction ones. See BOUNCE_TRACKING_SCOPE.md.
  const [domainWarnings, setDomainWarnings] = useState<string[]>([]);

  const recipients = parseRecipients(text);

  async function submit() {
    if (recipients.length === 0) {
      setStatus("error");
      setMessage("Add at least one recipient.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setDomainWarnings([]);
    try {
      const res = await fetch(`/api/templates/${templateId}/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
      setMessage(`Sent to ${data.count} recipient${data.count === 1 ? "" : "s"}.`);
      if (Array.isArray(data.domainWarnings)) setDomainWarnings(data.domainWarnings);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          asMenuItem
            ? cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")
            : "text-xs font-medium text-slate-500 hover:text-slate-700"
        }
      >
        {asMenuItem && <MailIcon />}
        Bulk send
      </button>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Bulk send this template</p>
            <p className="mt-1 text-xs text-slate-500">
              One recipient per line — <code>email@company.com</code> or <code>Name &lt;email@company.com&gt;</code>.
              Each gets their own copy, sent immediately.
            </p>
            <div className="relative mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={"jane@acme.com\nJohn Doe <john@acme.com>"}
                className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
              {/* Same popover shape as frequent-signers/signer-correction —
                  see BOUNCE_TRACKING_SCOPE.md. Every recipient here already
                  sent regardless, so this is a heads-up, not a decision. */}
              {domainWarnings.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setDomainWarnings([])}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {domainWarnings.length === 1 ? "One address might have a typo" : "A few addresses might have typos"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDomainWarnings([])}
                        aria-label="Close"
                        className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                      {domainWarnings.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{recipients.length} recipient{recipients.length === 1 ? "" : "s"} detected</p>
            {status === "error" && <p className="mt-2 text-sm text-red-600">{message}</p>}
            {status === "done" && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onSelect?.();
                }}
              >
                {status === "done" ? "Close" : "Cancel"}
              </Button>
              {status !== "done" && (
                <Button size="sm" onClick={submit} disabled={status === "loading"}>
                  {status === "loading" ? "Sending…" : "Send to all"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
