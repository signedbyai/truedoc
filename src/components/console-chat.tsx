"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseNdjsonLine, splitNdjsonLines } from "@/lib/ndjson";

// The console chat pane (CONSOLE_UX_SCOPE.md #2). Talks to
// POST /api/console/chat, which runs a Mistral tool-calling loop over a
// narrow, fixed action set (send/bulk-send/status/list/void — see
// src/lib/console-chat.ts). send_document and bulk_send come back as a
// "confirm" turn instead of executing immediately — this component renders
// that as inline Confirm/Cancel buttons on the assistant's bubble, and only
// calls the API again with confirmedTool once the user actually clicks
// Confirm. No action that emails a real person ever runs without that
// explicit second click.
//
// Also autosaves to /api/console/conversations as a "chat session"
// (2026-07-31, migration 0041) — see the persist effect below and
// console-workspace.tsx, which owns the history sidebar and remounts this
// component (via `key`) when the user switches conversations or starts a
// new one.

export type Bubble =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; confirm?: { tool: string; arguments: Record<string, unknown> } };

// Bulk-send recipient lists can arrive as an uploaded file (2026-07-31)
// instead of pasted text — deliberately NOT reusing parse-recipients.ts's
// regex parser (that only understands "email" / "Name <email>" per line,
// used by the dashboard's bulk-send-button.tsx textarea). Here the raw file
// text is handed to the model as a normal chat message instead, same as if
// the user had pasted it — Mistral already does its own flexible parsing of
// whatever shape the list is in (comma-separated, "email, name", CSV
// columns, etc.), so there's no second parser to keep in sync. Selecting a
// file just stages+sends that chat turn; the actual send still can't happen
// without the separate Confirm click on the bulk_send tool call, so this
// is safe to auto-send as a message.
const MAX_BULK_FILE_BYTES = 256 * 1024; // generous for a few hundred lines, well under Mistral's context limit
const MAX_BULK_FILE_LINES = 200; // matches bulkSendAction's own cap — fail fast client-side instead of a round trip

/** Reads /api/console/chat's streamed NDJSON body, forwarding each
 *  {type:"status"} line to onStatus as it arrives and returning whatever
 *  the final (non-status) line was. Falls back to a plain res.json() if
 *  the response has no readable body (e.g. an older mocked Response in a
 *  test, or an environment without streaming fetch support) — same shape
 *  either way, since the API always ends the stream with exactly one
 *  final result line. */
async function readStreamedTurn(res: Response, onStatus: (text: string) => void): Promise<Record<string, unknown>> {
  if (!res.body) return res.json().catch(() => ({}));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: Record<string, unknown> = {};

  const consume = (lines: string[]) => {
    for (const line of lines) {
      const obj = parseNdjsonLine(line);
      if (!obj) continue;
      if (obj.type === "status" && typeof obj.content === "string") onStatus(obj.content);
      else final = obj;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = splitNdjsonLines(buffer);
    buffer = rest;
    consume(lines);
    if (done) {
      consume(splitNdjsonLines(buffer + "\n").lines); // flush a final line with no trailing newline
      break;
    }
  }
  return final;
}

export function ConsoleChat({
  conversationId = null,
  initialMessages = [],
  onConversationSaved,
}: {
  /** The conversation's id if this is reopening a past chat, or null for a
   *  brand new one. Only read at mount time — console-workspace.tsx forces
   *  a remount (via `key`) whenever this should actually change, so there's
   *  no need to react to it changing on an already-mounted instance. */
  conversationId?: string | null;
  /** The saved messages if reopening a past chat, or [] for a new one. */
  initialMessages?: Bubble[];
  /** Fired after the autosave effect below creates or updates a saved
   *  conversation — lets the parent adopt a freshly-created id (without
   *  remounting this component mid-conversation) and refresh the sidebar's
   *  list. */
  onConversationSaved?: (id: string, title: string) => void;
} = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Bubble[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user has deliberately scrolled up to read earlier
  // messages — auto-scroll-to-bottom on new content only fires while this
  // is false, so it never yanks someone away from history they're reading
  // mid-conversation. Read inside the scroll effect via a ref (not state)
  // so that effect doesn't need to depend on it and re-run on every scroll.
  const scrolledUpRef = useRef(false);
  const convIdRef = useRef<string | null>(conversationId);
  // Guards the autosave effect against re-saving a conversation that was
  // just loaded (initialMessages) with no actual new turn yet — only the
  // FIRST run should be treated as "nothing changed since load".
  const lastSavedRef = useRef<string>(JSON.stringify(initialMessages));
  // Only the freeform "ask the model something" call is abortable — not
  // confirmAction below. Once a confirmed send/bulk_send is actually
  // in flight, documents may already be getting created/emailed
  // server-side; aborting the client fetch wouldn't stop that and would
  // just leave the UI out of sync with what really happened, so "stop"
  // deliberately only covers the safe-to-interrupt case (the model still
  // deciding what to do), never the point of no return.
  const abortRef = useRef<AbortController | null>(null);

  // Autosave — fires whenever `messages` actually changes (a completed
  // turn, a confirm/cancel resolution), not on every keystroke. Creates
  // the conversation on first save (POST, no id yet) or updates it
  // thereafter (PATCH). Best-effort: a failed autosave doesn't interrupt
  // the chat itself, just means that turn didn't make it into history.
  useEffect(() => {
    const serialized = JSON.stringify(messages);
    if (serialized === lastSavedRef.current) return;
    if (messages.length === 0) return;
    lastSavedRef.current = serialized;

    (async () => {
      try {
        if (!convIdRef.current) {
          const res = await fetch("/api/console/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && typeof data.id === "string") {
            convIdRef.current = data.id;
            onConversationSaved?.(data.id, String(data.title ?? ""));
          }
        } else {
          const res = await fetch(`/api/console/conversations/${convIdRef.current}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) onConversationSaved?.(convIdRef.current, String(data.title ?? ""));
        }
      } catch {
        // Best-effort — see comment above. Nothing surfaced to the user;
        // the conversation itself already succeeded or failed on its own.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Auto-scrolls to the latest message whenever the thread changes (a new
  // bubble, or a status line appearing/disappearing while a turn is in
  // flight) — but only if the user isn't already scrolled up reading
  // something earlier. Matches the standard chat-app pattern (ChatGPT/
  // Claude's own UI): new content doesn't yank you back to the bottom if
  // you deliberately scrolled away from it.
  useEffect(() => {
    if (scrolledUpRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  const NEAR_BOTTOM_PX = 48;

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    scrolledUpRef.current = !atBottom;
    setShowJumpToLatest(!atBottom);
  }

  function jumpToLatest() {
    scrolledUpRef.current = false;
    setShowJumpToLatest(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function historyForApi(bubbles: Bubble[]) {
    return bubbles
      .filter((b) => !(b.role === "assistant" && b.confirm))
      .map((b) => ({ role: b.role, content: b.content }));
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const next: Bubble[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");
    setStatus("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/console/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi(next) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong.");
        return;
      }
      const data = await readStreamedTurn(res, setStatus);
      if (data.type === "error") {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      if (data.type === "confirm") {
        setMessages((cur) => [
          ...cur,
          { role: "assistant", content: String(data.content ?? ""), confirm: { tool: String(data.tool), arguments: data.arguments as Record<string, unknown> } },
        ]);
      } else {
        setMessages((cur) => [...cur, { role: "assistant", content: String(data.content ?? "") }]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((cur) => [...cur, { role: "assistant", content: "Stopped." }]);
      } else {
        setError("Couldn't reach the console assistant.");
      }
    } finally {
      setLoading(false);
      setStatus("");
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function confirmAction(bubbleIndex: number, confirm: { tool: string; arguments: Record<string, unknown> }) {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/console/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], confirmedTool: { name: confirm.tool, arguments: confirm.arguments } }),
      });
      let data: Record<string, unknown>;
      if (!res.ok) {
        data = await res.json().catch(() => ({}));
      } else {
        data = await readStreamedTurn(res, setStatus);
      }
      setMessages((cur) => {
        const copy = [...cur];
        copy[bubbleIndex] = { role: "assistant", content: (cur[bubbleIndex] as { content: string }).content };
        return copy;
      });
      if (!res.ok || data.type === "error") {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
      } else {
        setMessages((cur) => [...cur, { role: "assistant", content: String(data.content ?? "") }]);
        router.refresh(); // refreshes the usage panel's server-fetched numbers
      }
    } catch {
      setError("Couldn't reach the console assistant.");
    } finally {
      setLoading(false);
      setStatus("");
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

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // clear so selecting the same file again still fires onChange
    if (!file || loading) return;
    setError("");

    const looksTextLike = /\.(csv|txt)$/i.test(file.name) || file.type === "" || file.type.startsWith("text/");
    if (!looksTextLike) {
      setError('Please attach a .csv or .txt file — a plain list of recipient emails, one per line (optionally with a name).');
      return;
    }
    if (file.size > MAX_BULK_FILE_BYTES) {
      setError("That file's too large for a bulk send — try trimming the list to a couple hundred rows.");
      return;
    }

    const text = (await file.text()).trim();
    const lineCount = text.split("\n").filter((l) => l.trim()).length;
    if (lineCount === 0) {
      setError("That file doesn't seem to have any recipients in it.");
      return;
    }
    if (lineCount > MAX_BULK_FILE_LINES) {
      setError(`That file has ${lineCount} rows — bulk send is capped at ${MAX_BULK_FILE_LINES} recipients per batch. Trim it and try again.`);
      return;
    }

    void send(`Here's a recipient list from "${file.name}" for a bulk send:\n\n${text}`);
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
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        {/* Scrollable message thread — the input bar below is a sibling
            outside this container, so it stays pinned at the bottom of the
            flex column (never scrolls) while this scrolls underneath it,
            which is what makes the input read as "floating" rather than
            just being the last thing on an ever-growing page
            (2026-07-31, direct feedback). */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex h-full flex-col gap-4 overflow-y-auto px-1 pb-1"
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <span className="font-mono text-lg text-neutral-600">&gt;_</span>
              <p className="max-w-xs text-base text-neutral-500">
                Ask console to send a document, bulk-send a list, check status, or void something — e.g. &ldquo;send the
                NDA template to jane@acme.com&rdquo;. For a bulk send, paste one recipient per line (email, or
                &ldquo;email, name&rdquo;) — or attach a .csv/.txt file with the{" "}
                <Paperclip className="inline h-3 w-3 -translate-y-px" aria-hidden="true" /> icon below.
              </p>
            </div>
          )}
          {/* text-base (2026-07-31, direct feedback: response text was too
              small to read comfortably) — was text-sm on both bubble types. */}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-2.5 text-base text-white">
                {m.content}
              </div>
            ) : (
              <div key={i} className="mr-auto max-w-[90%] text-base leading-relaxed text-neutral-200">
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
          {loading && status && (
            <p className="mr-auto text-sm italic text-neutral-500" aria-live="polite">
              {status}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating "jump to latest" button — only appears once the user
            has scrolled away from the bottom, hovering just above the
            input bar the same way it does in Claude's own chat UI
            (reference screenshot, 2026-07-31). */}
        {showJumpToLatest && (
          <button
            type="button"
            aria-label="Scroll to latest message"
            title="Scroll to latest"
            onClick={jumpToLatest}
            className="absolute bottom-2 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-neutral-800/90 text-white shadow-lg backdrop-blur hover:bg-neutral-700"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="px-1 pt-2 text-xs text-red-400">{error}</p>}

      {/* Taller composer (2026-07-31, direct feedback) — was a single row
          (icons + input + icons all inline); now the text entry sits on
          its own row up top with room to breathe, and the paperclip/model
          pill/send-stop button stay anchored in a row along the bottom,
          same relative positions as before. A plain single-line <input>
          became a <textarea> so the extra height is actually usable for
          multi-line text, not just empty padding — Enter still sends
          (Shift+Enter for a literal newline), unchanged from before. */}
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3">
        <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFileSelected} className="hidden" />
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={loading}
          placeholder="Ask to list or find a template, send or bulk send a template, check on status…"
          className="max-h-40 min-h-[52px] w-full resize-none bg-transparent text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Attach a recipient list for bulk send"
            title="Attach a recipient list (.csv or .txt) for bulk send"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              Mistral
            </span>
            {loading && abortRef.current ? (
              // Only reachable while send()'s own request is in flight — see
              // the comment on abortRef above for why confirmAction's
              // loading state never lands here.
              <button
                type="button"
                aria-label="Stop"
                title="Stop"
                onClick={stop}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send"
                title="Send"
                disabled={!input.trim()}
                onClick={() => send()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-slate-900 hover:bg-yellow-200 disabled:opacity-40 disabled:hover:bg-yellow-300"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
