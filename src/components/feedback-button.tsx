"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Send, MessageSquareHeart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Send us feedback" — the nav message-bubble icon (sits between the referral
// gift and the account avatar). Opens a one-textarea panel that posts to
// /api/feedback (emails the team + records it). Mirrors the ReferralGiftButton
// popover pattern. `variant`: "pill" = icon-only in a pill outline (desktop,
// matches the refer pill); "icon" = bare icon (mobile top bar).
export function FeedbackButton({
  firstName,
  variant = "icon",
}: {
  firstName: string | null;
  variant?: "icon" | "pill";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    // Reset after the panel is gone so it doesn't flash mid-close.
    window.setTimeout(() => {
      setMessage("");
      setSent(false);
      setError("");
    }, 150);
  }

  async function send() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, page: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't send just now — try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't send — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Send feedback"
        aria-expanded={open}
        className={
          variant === "pill"
            ? "flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
            : "flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
        }
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            {sent ? (
              <div className="py-2 text-center">
                <MessageSquareHeart className="mx-auto h-8 w-8 text-slate-900" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Thanks{firstName ? `, ${firstName}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-600">We got your message and we&apos;ll get back to you soon.</p>
                <Button size="sm" className="mt-3" onClick={close}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-900">Send us feedback</p>
                  <button type="button" onClick={close} aria-label="Close" className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">Ideas, bugs, or anything on your mind — we read every one.</p>
                {/* text-base (16px): under 16px iOS auto-zooms into the field
                    on focus and doesn't reliably zoom back out on close, which
                    left the page shifted. 16px stops the zoom entirely. */}
                <textarea
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="What's on your mind?"
                  className="mt-2 block w-full resize-none rounded-md border border-slate-300 p-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button type="button" onClick={close} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                    Cancel
                  </button>
                  <Button type="button" size="sm" onClick={send} disabled={!message.trim() || sending}>
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
