"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseRecipients } from "@/lib/parse-recipients";

export function BulkSendButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  const recipients = parseRecipients(text);

  async function submit() {
    if (recipients.length === 0) {
      setStatus("error");
      setMessage("Add at least one recipient.");
      return;
    }
    setStatus("loading");
    setMessage("");
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
        className="text-xs font-medium text-slate-500 hover:text-slate-700"
      >
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
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"jane@acme.com\nJohn Doe <john@acme.com>"}
              className="mt-3 w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-500">{recipients.length} recipient{recipients.length === 1 ? "" : "s"} detected</p>
            {status === "error" && <p className="mt-2 text-sm text-red-600">{message}</p>}
            {status === "done" && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
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
