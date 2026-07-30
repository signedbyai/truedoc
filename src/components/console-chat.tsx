"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// The console chat pane (CONSOLE_UX_SCOPE.md #2). Talks to
// POST /api/console/chat, which runs a Mistral tool-calling loop over a
// narrow, fixed action set (send/bulk-send/status/list/void — see
// src/lib/console-chat.ts). send_document and bulk_send come back as a
// "confirm" turn instead of executing immediately — this component renders
// that as inline Confirm/Cancel buttons on the assistant's bubble, and only
// calls the API again with confirmedTool once the user actually clicks
// Confirm. No action that emails a real person ever runs without that
// explicit second click.

type Bubble =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; confirm?: { tool: string; arguments: Record<string, unknown> } };

export function ConsoleChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function historyForApi(bubbles: Bubble[]) {
    return bubbles
      .filter((b) => !(b.role === "assistant" && b.confirm))
      .map((b) => ({ role: b.role, content: b.content }));
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Bubble[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/console/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi(next) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.type === "error") {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.type === "confirm") {
        setMessages((cur) => [...cur, { role: "assistant", content: data.content, confirm: { tool: data.tool, arguments: data.arguments } }]);
      } else {
        setMessages((cur) => [...cur, { role: "assistant", content: data.content }]);
      }
    } catch {
      setError("Couldn't reach the console assistant.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(bubbleIndex: number, confirm: { tool: string; arguments: Record<string, unknown> }) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/console/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], confirmedTool: { name: confirm.tool, arguments: confirm.arguments } }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((cur) => {
        const copy = [...cur];
        copy[bubbleIndex] = { role: "assistant", content: (cur[bubbleIndex] as { content: string }).content };
        return copy;
      });
      if (!res.ok || data.type === "error") {
        setError(data.error || "Something went wrong.");
      } else {
        setMessages((cur) => [...cur, { role: "assistant", content: data.content }]);
        router.refresh(); // refreshes the usage panel's server-fetched numbers
      }
    } catch {
      setError("Couldn't reach the console assistant.");
    } finally {
      setLoading(false);
    }
  }

  function cancelAction(bubbleIndex: number) {
    setMessages((cur) => {
      const copy = [...cur];
      const bubble = cur[bubbleIndex] as { role: "assistant"; content: string };
      copy[bubbleIndex] = { role: "assistant", content: bubble.content };
      return [...copy, { role: "assistant", content: "Cancelled." }];
    });
  }

  return (
    // Borderless canvas + a pill-shaped input bar, not a bordered white
    // card — direct visual reference 2026-07-31 (a screenshot of Claude's
    // own chat interface: near-black bg, no card around the conversation
    // itself, dark-gray user bubbles instead of white/bright ones,
    // assistant text with no bubble at all, and a distinct rounded input
    // bar only at the bottom). Matched as closely as this component's
    // extra requirements (Confirm/Cancel buttons on some assistant turns,
    // an error line) allow.
    <div className="flex min-h-[460px] flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="font-mono text-lg text-neutral-600">&gt;_</span>
            <p className="max-w-xs text-sm text-neutral-500">
              Ask console to send a document, bulk-send a list, check status, or void something — e.g. &ldquo;send the
              NDA template to jane@acme.com&rdquo;. For a bulk send, paste one recipient per line (email, or
              &ldquo;email, name&rdquo;).
            </p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-2.5 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-auto max-w-[90%] text-sm leading-relaxed text-neutral-200">
              {m.content}
              {m.confirm && (
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="cta" size="sm" disabled={loading} onClick={() => confirmAction(i, m.confirm!)}>
                    Confirm send
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading}
                    onClick={() => cancelAction(i)}
                    className="bg-transparent text-neutral-400 hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {error && <p className="px-1 pt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900 px-3 py-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={loading}
          placeholder="Ask console to send, check, or bulk-send a document"
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <Button type="button" variant="cta" size="sm" disabled={loading || !input.trim()} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
