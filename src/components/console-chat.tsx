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
    <div className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-slate-900">Console chat</p>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask console to send a document, bulk-send a list, check status, or void something — e.g. &ldquo;send the
            NDA template to jane@acme.com&rdquo;.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-auto max-w-[90%] rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
              {m.content}
              {m.confirm && (
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" disabled={loading} onClick={() => confirmAction(i, m.confirm!)}>
                    Confirm send
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => cancelAction(i)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
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
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <Button type="button" size="sm" disabled={loading || !input.trim()} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
