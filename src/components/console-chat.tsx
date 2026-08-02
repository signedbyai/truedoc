"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronDown, Copy, ExternalLink, FileText, FileUp, Paperclip, ShieldCheck, Square, X } from "lucide-react";
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
  | {
      role: "assistant";
      content: string;
      confirm?: { tool: string; arguments: Record<string, unknown> };
      // A plain outbound link rendered alongside (or instead of) the
      // confirm buttons above — used by the upload-a-template flow's
      // "Review fields" action (2026-08-01), which opens the existing
      // field editor in a new tab rather than running anything through
      // this chat's own confirm/execute mechanism.
      link?: { href: string; label: string };
      // Verified Badge upload flow (2026-08-01, VERIFIED_BADGE_SCOPE.md):
      // the appended/separate/both question, asked conversationally right
      // after an upload when the org's Settings preference is "ask." Kept
      // as plain local click handlers (see chooseCertificateMode below),
      // NOT routed through Mistral's tool-calling loop — same reasoning as
      // save_as_template/seal_document being absent from TOOLS: the raw
      // document_id from a just-finished upload should never be something
      // the model has to guess or resolve, only something the UI already
      // has in hand.
      certificateModeChoice?: { documentId: string; filename: string };
      // seal_document's result (2026-08-01, direct feedback) — renders a
      // copy-link button plus inline download buttons for whichever files
      // this seal actually produced, instead of the raw verify URL and a
      // pointer to the documents list.
      sealed?: { documentId: string; verifyUrl: string; hasSignedFile: boolean; hasCertificateFile: boolean };
    };

/** Copies `text` to the clipboard on click/tap and flashes a brief check
 *  mark instead of relying on a tooltip alone — 2026-07-31, direct ask:
 *  anything the user might need to select out of a reply (a template name
 *  in a list, an id) should be copyable with a single press rather than a
 *  manual select-and-copy, which is fiddly on mobile in particular. */
function CopyableValue({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) —
      // the button still gives visual feedback either way since the value
      // is short enough to select manually as a fallback.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy "${value}"`}
      className={`group inline-flex max-w-full items-center gap-1 rounded-md px-1 -mx-1 text-left hover:bg-white/10 active:bg-white/15 ${className}`}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-yellow-300" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-neutral-500 opacity-0 group-hover:opacity-100" aria-hidden="true" />
      )}
    </button>
  );
}

/** A pill button (same visual weight as the m.link "Open in editor" button
 *  below) that copies `value` on click and flashes its label to "Copied"
 *  instead of showing the value itself — 2026-08-01, direct feedback: the
 *  Verified Badge verify link is a full SHA-512 hash, unwieldy to read or
 *  select by hand, so unlike CopyableValue above this deliberately never
 *  renders the raw string, just a short fixed label. */
function CopyLinkButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Same clipboard-unavailable fallback as CopyableValue — still flash
      // the "Copied" state since there's nothing more useful to do here.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Splits a run of inline text on **bold**, *italic*, and `code` markers
 *  and returns real elements for them — the system prompt (console-chat.ts)
 *  doesn't ask Mistral to use markdown, but the model reaches for it anyway
 *  (2026-07-31, direct ask: output was showing up as literal asterisks
 *  instead of rendering, e.g. "**SignedBy Console**"), so this renders
 *  whatever markdown-ish syntax actually comes back rather than trying to
 *  suppress it at the prompt level. */
function inlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-neutral-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={key} className="text-neutral-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

const HR_RE = /^[-–—_ー]{3,}$/;
const BULLET_RE = /^[-*•]\s+/;
const NUMBERED_RE = /^\d+[.)]\s+/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;

/** Parses a Unicode box-drawing grid table (see console-chat.ts's system
 *  prompt, which is what tells Mistral to draw these for any list of
 *  documents/templates/recipients) into header + row cell arrays. Border
 *  lines (┌/├/└-prefixed) carry no cell text and are skipped; every
 *  remaining line starting with │ is either the header or a data row, in
 *  order. Returns null if the block doesn't actually look like a
 *  well-formed table (e.g. a stray box-drawing character in prose), so
 *  callers can fall back to the old raw <pre> rendering rather than
 *  showing a broken table. */
function parseBoxTable(block: string): { header: string[]; rows: string[][] } | null {
  const cellLines = block.split("\n").filter((line) => line.trim().startsWith("│"));
  if (cellLines.length < 2) return null;
  const toCells = (line: string) =>
    line
      .split("│")
      .map((c) => c.trim())
      .filter((_, i, arr) => !(i === 0 || i === arr.length - 1) || arr[i] !== ""); // drop the empty edge fragments from a leading/trailing │
  const rows = cellLines.map(toCells).filter((r) => r.length > 0);
  if (rows.length < 2) return null;
  const width = rows[0].length;
  if (!rows.every((r) => r.length === width)) return null;
  return { header: rows[0], rows: rows.slice(1) };
}

// Matches a GFM table's separator row: |---|---|, |:--|--:|, ---|---, etc.
// (leading/trailing pipes optional either way, same as the header/data rows).
const PIPE_TABLE_SEPARATOR_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;

/** Parses a standard markdown pipe table (2026-08-01, direct ask — Mistral
 *  reaches for GFM-style `| a | b |` / `|---|---|` tables for things like
 *  template lists, same as it reaches for **bold**, and those were
 *  rendering as literal pipe-and-dash text instead of an actual table).
 *  Returns null if the block doesn't have a real separator row on line 2,
 *  so callers fall back to plain paragraph rendering rather than mangling
 *  prose that merely contains a "|" character. */
function parsePipeTable(block: string): { header: string[]; rows: string[][] } | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2 || !lines[0].startsWith("|") || !PIPE_TABLE_SEPARATOR_RE.test(lines[1])) return null;

  const toCells = (line: string) => {
    const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((c) => c.trim());
  };
  const header = toCells(lines[0]);
  const rows = lines
    .slice(2)
    .filter((l) => l.startsWith("|"))
    .map(toCells);
  if (rows.length === 0) return null;
  // Defensively pad/trim data rows to the header's width rather than
  // dropping the whole table over one ragged row from the model.
  const width = header.length;
  return { header, rows: rows.map((r) => (r.length === width ? r : [...r, ...Array(Math.max(0, width - r.length)).fill("")].slice(0, width))) };
}

/** Shared table markup for both parsers above — box-drawing tables and GFM
 *  pipe tables render identically once parsed into header/rows. */
function renderTable(table: { header: string[]; rows: string[][] }, blockKey: number): React.ReactNode {
  return (
    <div key={blockKey} className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.04]">
            {table.header.map((cell, i) => (
              <th key={i} className="px-3 py-1.5 text-left font-medium text-neutral-400">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className={r % 2 ? "bg-white/[0.02]" : ""}>
              {row.map((cell, c) =>
                c === 0 ? (
                  <td key={c} className="px-3 py-1.5 text-neutral-200">
                    <CopyableValue value={cell} />
                  </td>
                ) : (
                  <td key={c} className="px-3 py-1.5 text-neutral-400">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders one markdown-ish block: a table, a heading, a horizontal rule,
 *  a bullet/numbered list, or a paragraph — grouping consecutive lines of
 *  the same kind together (a block can mix a heading line directly above
 *  plain prose with only single newlines between them, which is exactly
 *  the shape Mistral's replies come back in). Table cells in the first
 *  column (documents/templates are always listed there per the system
 *  prompt) render via CopyableValue so a name can be grabbed with one
 *  press instead of a manual select. */
function renderBlock(block: string, blockKey: number): React.ReactNode {
  // GFM-style pipe table (`| a | b |` / `|---|---|`) — checked first since
  // its lines start with a plain "|", nothing box-drawing-specific to key
  // off of. See parsePipeTable's doc comment.
  const firstLine = block.split("\n")[0]?.trim() ?? "";
  if (firstLine.startsWith("|")) {
    const pipeTable = parsePipeTable(block);
    if (pipeTable) return renderTable(pipeTable, blockKey);
  }

  if (/[┌┬┐├┼┤└┴┘─│╭╮╰╯]/.test(block)) {
    const table = parseBoxTable(block);
    if (table) return renderTable(table, blockKey);
    // Didn't parse as a clean table — fall back to the raw monospace block
    // rather than lose alignment entirely.
    return (
      <pre key={blockKey} className="overflow-x-auto whitespace-pre font-mono text-sm text-neutral-200">
        {block}
      </pre>
    );
  }

  const lines = block.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let group = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = line.match(HEADING_RE);
    if (heading) {
      const Tag = (["h4", "h4", "h4", "h5", "h5", "h5"][heading[1].length - 1] ?? "h5") as "h4" | "h5";
      nodes.push(
        <Tag key={`${blockKey}-${group}`} className="font-semibold text-white">
          {inlineMarkdown(heading[2], `${blockKey}-${group}`)}
        </Tag>
      );
      i += 1;
      group += 1;
      continue;
    }
    if (HR_RE.test(line.trim())) {
      nodes.push(<hr key={`${blockKey}-${group}`} className="border-white/10" />);
      i += 1;
      group += 1;
      continue;
    }
    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        items.push(lines[i].replace(BULLET_RE, ""));
        i += 1;
      }
      nodes.push(
        <ul key={`${blockKey}-${group}`} className="list-disc space-y-0.5 pl-5">
          {items.map((item, j) => (
            <li key={j}>{inlineMarkdown(item, `${blockKey}-${group}-${j}`)}</li>
          ))}
        </ul>
      );
      group += 1;
      continue;
    }
    if (NUMBERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED_RE.test(lines[i])) {
        items.push(lines[i].replace(NUMBERED_RE, ""));
        i += 1;
      }
      nodes.push(
        <ol key={`${blockKey}-${group}`} className="list-decimal space-y-0.5 pl-5">
          {items.map((item, j) => (
            <li key={j}>{inlineMarkdown(item, `${blockKey}-${group}-${j}`)}</li>
          ))}
        </ol>
      );
      group += 1;
      continue;
    }
    // Plain prose lines — collect a run of them into one paragraph, joined
    // with <br/> so single newlines within a block still read as line
    // breaks instead of being collapsed.
    const prose: string[] = [];
    while (i < lines.length && !HEADING_RE.test(lines[i]) && !HR_RE.test(lines[i].trim()) && !BULLET_RE.test(lines[i]) && !NUMBERED_RE.test(lines[i])) {
      prose.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={`${blockKey}-${group}`}>
        {prose.map((line, j) => (
          <span key={j}>
            {inlineMarkdown(line, `${blockKey}-${group}-${j}`)}
            {j < prose.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
    group += 1;
  }
  return (
    <div key={blockKey} className="flex flex-col gap-2">
      {nodes}
    </div>
  );
}

/** Renders an assistant reply: splits it into blank-line-separated blocks,
 *  then renders each as a table, heading, list, rule, or paragraph (see
 *  renderBlock above). Markdown-ish syntax (**bold**, headings, lists) now
 *  actually renders instead of showing up as literal asterisks/hashes
 *  (2026-07-31, direct ask), and box-drawing tables render as real <table>
 *  markup with a copy-on-press first column instead of a raw monospace
 *  block. */
function AssistantContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return <div className="flex flex-col gap-3">{blocks.map((block, i) => renderBlock(block, i))}</div>;
}

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
// Still a real ceiling (2026-07-31: the old MAX_BULK_FILE_LINES=200 check
// right below this was removed — it only existed to mirror bulkSendAction's
// now-dropped 200-recipient cap, see console-actions.ts) — this one is
// about not overflowing Mistral's own context window with the raw file
// text, not a business limit on batch size.
const MAX_BULK_FILE_BYTES = 256 * 1024; // generous for a few thousand lines, well under Mistral's context limit

// Upload-a-template (2026-08-01, direct ask) — a
// second paperclip option that goes straight to R2 (the existing
// direct-to-R2 dashboard uploader, /api/documents/upload-url + finalize),
// runs the existing stateless AI field-suggestion pass
// (/api/documents/[id]/suggest-fields — writes nothing itself), and then
// offers either an immediate "Save now" (a new save_as_template confirm
// action, single-signer/readable documents only) or a "Review fields" link
// into the existing field editor, which already has its own
// save-as-template control. None of this goes through Mistral at all —
// it's plain fetch orchestration, same shape as the existing dashboard
// uploader in new-document-client.tsx, just triggered from here instead.
// Matches the dashboard uploader's own 25MB product cap.
const MAX_TEMPLATE_FILE_BYTES = 25 * 1024 * 1024;

// Multi-party documents are the one place AI field placement is known to
// sometimes get role-matching wrong (the 2026-07-26 column-matching fix),
// and an "unreadable" result is a pure guess with no relationship to the
// document's real content (see suggest-fields.ts's own doc comment on that
// flag) — both only get offered the review link below, never a one-click
// save straight to a reusable template.

// Prefills the composer with a friendly nudge the very first time anyone on
// this browser opens a brand-new console chat (2026-07-31, direct ask) — a
// real, editable/sendable value in the textarea itself, not just placeholder
// text, so a first-time user can get a response with a single tap of Send
// before they've figured out what to ask. Tracked in localStorage (not a
// cookie — see the project's standing preference to avoid new cookies) so it
// only ever fires once per browser, and only ever on a genuinely empty new
// chat — reopening a past conversation or a chat that already has a draft
// typed never overwrites it.
const FIRST_OPEN_PROMPT_KEY = "signedby-console-first-open-prompt-seen";
const FIRST_OPEN_PROMPT_TEXT = "Let me know what you can do…";

// First-use explainer for the paperclip button (2026-07-31, direct ask —
// was a browser-native `title` tooltip only, easy to miss and not
// discoverable on mobile where there's no hover at all). Same
// localStorage-gate-once pattern as the composer prefill above and
// ConsolePlanStatus's "What is console?" popover: shows once per browser,
// dismissed either by the explicit X or automatically the first time
// someone actually attaches a file (they've now discovered it either way).
const PAPERCLIP_INTRO_KEY = "signedby-console-paperclip-intro-dismissed";

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
  certificateModePreference = "ask",
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
  /** The org's Settings preference for Verified Badge's certificate
   *  question (organizations.verified_badge_certificate_mode) — "ask"
   *  (default) means handleVerifiedBadgeFileSelected below asks
   *  conversationally after every upload; any other value skips the
   *  question and seals straight away using that mode. */
  certificateModePreference?: "ask" | "appended" | "separate" | "both";
} = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Bubble[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [paperclipIntroOpen, setPaperclipIntroOpen] = useState(false);
  // Small popover the paperclip opens with two choices — recipient list vs
  // upload a template — replacing what used to be a single click straight
  // to the recipient-list file picker (2026-08-01, see MAX_TEMPLATE_FILE_BYTES
  // above).
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const verifiedBadgeFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user has deliberately scrolled up to read earlier
  // messages — auto-scroll-to-bottom on new content only fires while this
  // is false, so it never yanks someone away from history they're reading
  // mid-conversation. Read inside the scroll effect via a ref (not state)
  // so that effect doesn't need to depend on it and re-run on every scroll.
  const scrolledUpRef = useRef(false);
  const composerRef = useRef<HTMLDivElement>(null);
  // Measured height (px) of the fixed mobile composer bar, or null once
  // we're at the lg breakpoint where it sits in normal flow instead of
  // floating over the content. See the effect below — the old flat pb-32
  // guess on the scroll container fell short any time the composer grew
  // past its single-line resting height (a multi-line draft, a device's
  // safe-area inset), silently burying the newest message's own buttons
  // (Confirm/Cancel, Seal it, etc.) behind the input bar (2026-08-01,
  // direct report: "you can see only half a button and it's hard to press").
  const [composerOverlapPx, setComposerOverlapPx] = useState<number | null>(null);
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

  // See FIRST_OPEN_PROMPT_KEY above. Runs once on mount, client-only (a
  // useEffect rather than a useState initializer, so the server-rendered
  // and first client render both start from the same empty string and
  // there's no hydration mismatch).
  useEffect(() => {
    if (conversationId || initialMessages.length > 0) return;
    try {
      if (window.localStorage.getItem(FIRST_OPEN_PROMPT_KEY)) return;
      window.localStorage.setItem(FIRST_OPEN_PROMPT_KEY, "1");
      // Deferred a tick — same react-hooks/set-state-in-effect workaround
      // used elsewhere in the app (new-document-button.tsx, field-editor.tsx).
      Promise.resolve().then(() => setInput((cur) => cur || FIRST_OPEN_PROMPT_TEXT));
    } catch {
      // Storage can throw (private browsing, blocked storage) — a missed
      // one-time nudge isn't worth surfacing an error for.
    }
    // Deliberately mount-only — conversationId/initialMessages are only
    // ever meant to be read as they were at mount here (see the prop docs
    // above: console-workspace.tsx remounts this component via `key`
    // whenever either should actually change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // See PAPERCLIP_INTRO_KEY above.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PAPERCLIP_INTRO_KEY)) return;
      // Deferred a tick — same react-hooks/set-state-in-effect workaround
      // used elsewhere in the app (new-document-button.tsx, field-editor.tsx).
      Promise.resolve().then(() => setPaperclipIntroOpen(true));
    } catch {
      // Storage can throw (private browsing, blocked storage) — worst case
      // the tooltip-only `title` attribute is still there as a fallback.
    }
  }, []);

  function dismissPaperclipIntro() {
    setPaperclipIntroOpen(false);
    try {
      window.localStorage.setItem(PAPERCLIP_INTRO_KEY, "1");
    } catch {
      // Best-effort — worst case it shows again next visit.
    }
  }

  // Autosave — fires whenever `messages` actually changes (a completed
  // turn, a confirm/cancel resolution), not on every keystroke. Creates
  // the conversation on first save (POST, no id yet) or updates it
  // thereafter (PATCH). Best-effort: a failed autosave doesn't interrupt
  // the chat itself, just means that turn didn't make it into history.
  //
  // keepalive: true (2026-08-02, direct bug report) — the exact turn most
  // likely to trigger a same-tab navigation away (one that just produced a
  // Verified Badge attachment link) is also the turn whose autosave is most
  // likely to still be in flight when the user taps that link. A plain
  // fetch() gets aborted on page unload, silently dropping that turn from
  // History; keepalive lets the browser finish sending it in the
  // background instead. (The attachment links themselves were also missing
  // target="_blank", the more direct fix for losing the chat/its state
  // entirely — see the m.sealed links above — but this covers every other
  // path that still navigates the same tab away mid-save.)
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
            keepalive: true,
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
            keepalive: true,
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

  // Keeps composerOverlapPx in sync with the composer's actual rendered
  // height below the lg breakpoint (where it's `fixed` and floats over the
  // message thread), and clears it back to null at lg+ (where it's
  // `lg:static`, in normal flex flow, so nothing needs to reserve room for
  // it). ResizeObserver catches every height change that matters here — the
  // textarea growing/shrinking with its content (up to max-h-40), a
  // multi-line draft, or a device's safe-area-inset-bottom differing — not
  // just the ones triggered by state changes this component already knows
  // about.
  useEffect(() => {
    const composerEl = composerRef.current;
    if (!composerEl || typeof ResizeObserver === "undefined" || typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 1024px)"); // Tailwind's lg breakpoint
    const update = () => {
      setComposerOverlapPx(mq.matches ? null : composerEl.getBoundingClientRect().height + 16);
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(composerEl);
    mq.addEventListener("change", update);
    return () => {
      resizeObserver.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

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
      } else if (data.type === "sealed") {
        setMessages((cur) => [
          ...cur,
          {
            role: "assistant",
            content: String(data.content ?? ""),
            sealed: {
              documentId: String(data.documentId ?? ""),
              verifyUrl: String(data.verifyUrl ?? ""),
              hasSignedFile: Boolean(data.hasSignedFile),
              hasCertificateFile: Boolean(data.hasCertificateFile),
            },
          },
        ]);
        router.refresh();
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

  /** Resolves the appended/separate/both quick-reply question a Verified
   *  Badge upload asks (see handleVerifiedBadgeFileSelected below) —
   *  strips the choice buttons off that bubble (same in-place-mutation
   *  pattern confirmAction/cancelAction use above) and appends a normal
   *  confirm bubble for seal_document with the chosen mode baked in. */
  function chooseCertificateMode(
    bubbleIndex: number,
    documentId: string,
    filename: string,
    mode: "appended" | "separate" | "both"
  ) {
    const modeLabel =
      mode === "appended" ? "appended to the file" : mode === "separate" ? "kept as a separate certificate" : "both — appended and separate";

    setMessages((cur) => {
      const copy = [...cur];
      const bubble = cur[bubbleIndex] as { role: "assistant"; content: string };
      copy[bubbleIndex] = { role: "assistant", content: bubble.content };
      return [
        ...copy,
        { role: "user", content: `${modeLabel.charAt(0).toUpperCase()}${modeLabel.slice(1)}, please.` },
        {
          role: "assistant",
          content: `Ready to seal "${filename}" — ${modeLabel}. Confirm?`,
          confirm: { tool: "seal_document", arguments: { document_id: documentId, certificate_mode: mode } },
        },
      ];
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
      setError("That file's too large to attach here — try trimming the list down.");
      return;
    }

    const text = (await file.text()).trim();
    const lineCount = text.split("\n").filter((l) => l.trim()).length;
    if (lineCount === 0) {
      setError("That file doesn't seem to have any recipients in it.");
      return;
    }

    dismissPaperclipIntro(); // they've now discovered what the paperclip does
    void send(`Here's a recipient list from "${file.name}" for a bulk send:\n\n${text}`);
  }

  /** Upload-a-template (see MAX_TEMPLATE_FILE_BYTES above). Three plain
   *  fetches against existing, already-shipped endpoints — presigned PUT to
   *  R2, finalize, then the stateless AI field-suggestion pass — followed
   *  by a synthetic user+assistant bubble pair built from the result. None
   *  of this is a Mistral turn: `loading`/`status`/`error` are reused for
   *  their existing composer-disabling/status-line/error-line behavior, but
   *  no /api/console/chat call happens until (if) "Save now" is clicked,
   *  which reuses the existing confirmAction plumbing untouched. */
  async function handleTemplateFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || loading) return;
    setError("");

    if (!/\.pdf$/i.test(file.name)) {
      setError("Please attach a PDF to upload as a template.");
      return;
    }
    if (file.size > MAX_TEMPLATE_FILE_BYTES) {
      setError("That file's too large — try one under 25MB.");
      return;
    }

    dismissPaperclipIntro();
    setLoading(true);
    setStatus("Uploading…");

    try {
      const presignRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) {
        setError(presign.error || "Couldn't start the upload.");
        return;
      }

      const putRes = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!putRes.ok) {
        setError("Upload failed. Try again.");
        return;
      }

      const finalizeRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: presign.documentId, key: presign.key, filename: file.name }),
      });
      const finalize = await finalizeRes.json().catch(() => ({}));
      if (!finalizeRes.ok) {
        setError(finalize.error || "Couldn't save the upload.");
        return;
      }
      const documentId = String(finalize.id);

      setStatus("Placing fields…");
      const suggestRes = await fetch(`/api/documents/${documentId}/suggest-fields`, { method: "POST" });
      const suggest = await suggestRes.json().catch(() => ({}));
      if (!suggestRes.ok) {
        setError(suggest.error || "Couldn't analyze the document.");
        return;
      }

      const suggestions = Array.isArray(suggest.suggestions) ? suggest.suggestions : [];
      const parties: { role: number; label: string }[] = Array.isArray(suggest.parties) ? suggest.parties : [];
      const unreadable = suggest.unreadable === true;
      const fieldCount = suggestions.length;
      const defaultName = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled template";
      // ?from=console (2026-08-02, direct ask) — lets the editor show a
      // couple of console-specific hints (don't re-click Suggest while
      // it's still running; the template name is prefilled to match this
      // same defaultName) only for someone who actually landed here via
      // Console, not every document editor visit. See field-editor.tsx's
      // cameFromConsole prop.
      //
      // &c=<conversationId> (2026-08-02, TEMPLATE_BROWSE_SCOPE.md) — rides
      // along so the editor's "Back to Console" button can reopen this
      // exact conversation instead of a blank one. convIdRef.current is
      // already known here — this same upload turn is what the autosave
      // effect below is about to persist (or already has, if this isn't
      // the first turn), so the id either already exists or will exist by
      // the time anyone clicks the link. Omitted (falls back to a blank
      // new chat) only in the edge case of the very first turn in a
      // conversation somehow not having autosaved yet — harmless, just
      // loses the resume behavior for that one rare case.
      const reviewLink = {
        href: `https://signedby.ai/dashboard/documents/${documentId}?from=console${convIdRef.current ? `&c=${convIdRef.current}` : ""}`,
        label: "Review fields",
      };

      const userBubble: Bubble = { role: "user", content: `Uploaded "${file.name}" to use as a template.` };
      let assistantBubble: Bubble;

      if (unreadable) {
        assistantBubble = {
          role: "assistant",
          content: `Uploaded "${file.name}," but I couldn't confidently read it to place fields — take a look in the editor and place them by hand.`,
          link: { ...reviewLink, label: "Open in editor" },
        };
      } else if (parties.length >= 2) {
        const roleNames = parties.map((p) => p.label).join(", ");
        assistantBubble = {
          role: "assistant",
          content: `Uploaded "${file.name}" and placed ${fieldCount} field${fieldCount === 1 ? "" : "s"} across ${parties.length} signer roles (${roleNames}). Multi-signer layouts are the one place I sometimes get role-matching wrong, so take a look before this becomes a reusable template.`,
          link: reviewLink,
        };
      } else {
        assistantBubble = {
          role: "assistant",
          content: `Uploaded "${file.name}" and placed ${fieldCount} field${fieldCount === 1 ? "" : "s"}. Want to look them over first, or save it as "${defaultName}" now?`,
          link: reviewLink,
          confirm: { tool: "save_as_template", arguments: { document_id: documentId, name: defaultName, fields: suggestions } },
        };
      }

      setMessages((cur) => [...cur, userBubble, assistantBubble]);
    } catch {
      setError("Couldn't upload that file. Try again.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  /** Get a Verified Badge (2026-08-01, VERIFIED_BADGE_SCOPE.md) — same
   *  presign/PUT/finalize upload as handleTemplateFileSelected above (the
   *  file intake mechanics are identical), but no suggest-fields pass:
   *  there's nothing to place fields for, a seal just certifies the file
   *  as-is. Ends either with a conversational appended/separate/both
   *  question (certificateModePreference === "ask", the default) or
   *  straight to a confirm bubble using the org's standing Settings
   *  preference. */
  async function handleVerifiedBadgeFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || loading) return;
    setError("");

    if (!/\.pdf$/i.test(file.name)) {
      setError("Please attach a PDF to seal.");
      return;
    }
    if (file.size > MAX_TEMPLATE_FILE_BYTES) {
      setError("That file's too large — try one under 25MB.");
      return;
    }

    dismissPaperclipIntro();
    setLoading(true);
    setStatus("Uploading…");

    try {
      const presignRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) {
        setError(presign.error || "Couldn't start the upload.");
        return;
      }

      const putRes = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!putRes.ok) {
        setError("Upload failed. Try again.");
        return;
      }

      const finalizeRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: presign.documentId, key: presign.key, filename: file.name }),
      });
      const finalize = await finalizeRes.json().catch(() => ({}));
      if (!finalizeRes.ok) {
        setError(finalize.error || "Couldn't save the upload.");
        return;
      }
      const documentId = String(finalize.id);

      const userBubble: Bubble = { role: "user", content: `Uploaded "${file.name}" to seal as a Verified Badge.` };
      let assistantBubble: Bubble;

      if (certificateModePreference === "ask") {
        assistantBubble = {
          role: "assistant",
          content: `Got "${file.name}." Want the certificate appended to the file, kept as a separate document, or both? (Change the default any time in Settings.)`,
          certificateModeChoice: { documentId, filename: file.name },
        };
      } else {
        const modeLabel =
          certificateModePreference === "appended"
            ? "appended to the file"
            : certificateModePreference === "separate"
              ? "a separate certificate"
              : "both appended and separate";
        assistantBubble = {
          role: "assistant",
          content: `Got "${file.name}." Ready to seal it — ${modeLabel}, per your Settings preference. Confirm?`,
          confirm: { tool: "seal_document", arguments: { document_id: documentId, certificate_mode: certificateModePreference } },
        };
      }

      setMessages((cur) => [...cur, userBubble, assistantBubble]);
    } catch {
      setError("Couldn't upload that file. Try again.");
    } finally {
      setLoading(false);
      setStatus("");
    }
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
          // pb-32 is the fallback/first-paint guess before composerOverlapPx
          // is measured (2026-07-31) — the composer below switches to
          // `fixed` positioning at the bottom of the viewport on small
          // screens (see the input bar below) rather than sitting in normal
          // document flow, so it no longer pushes this scroll area up on
          // its own; bottom padding does that job instead, keeping the last
          // message from being covered by the fixed bar. Once measured, the
          // inline style below overrides that flat guess with the
          // composer's actual live height (see composerOverlapPx's effect)
          // so a taller composer (multi-line draft, safe-area inset) can't
          // silently bury the newest message's buttons behind it
          // (2026-08-01 fix). Not needed at lg: and up, where the composer
          // is back in flow — composerOverlapPx is null there, so the
          // inline style is omitted and lg:pb-1 applies untouched.
          className="flex h-full flex-col gap-4 overflow-y-auto px-1 pb-32 lg:pb-1"
          style={composerOverlapPx !== null ? { paddingBottom: composerOverlapPx } : undefined}
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <span className="font-mono text-lg text-neutral-600">&gt;_</span>
              <p className="max-w-xs text-base text-neutral-500">
                Ask console to send a document, bulk-send a list, check status, or void something — e.g. &ldquo;send the
                NDA template to jane@acme.com&rdquo;. For a bulk send, paste one recipient per line (email, or
                &ldquo;email, name&rdquo;) — or use the{" "}
                <Paperclip className="inline h-3 w-3 -translate-y-px" aria-hidden="true" /> icon below to get a
                Verified Badge for proof, upload a new template, or attach a recipient list.
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
                <AssistantContent content={m.content} />
                {m.certificateModeChoice && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["appended", "separate", "both"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => chooseCertificateMode(i, m.certificateModeChoice!.documentId, m.certificateModeChoice!.filename, mode)}
                      >
                        {mode === "appended" ? "Appended" : mode === "separate" ? "Separate" : "Both"}
                      </Button>
                    ))}
                  </div>
                )}
                {m.sealed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyLinkButton value={m.sealed.verifyUrl} label="Copy verify link" />
                    <a
                      href={m.sealed.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Open verify page
                    </a>
                    {/* target="_blank" (2026-08-02, direct bug report) — these
                        three were missing it, unlike verifyUrl/m.link.href
                        above. On mobile, tapping one navigated the SAME tab
                        away from console.signedby.ai entirely; hitting back
                        then landed on a fresh mount with no chat and, worse,
                        could abort the in-flight autosave fetch for the very
                        turn that had just produced this attachment (see the
                        keepalive fix on the autosave effect below) — so the
                        last turn could be missing from History too. Opening
                        in a new tab keeps the console tab alive and never
                        interrupts that autosave at all. */}
                    {m.sealed.hasSignedFile && (
                      <a
                        href={`/api/documents/${m.sealed.documentId}/signed-file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Sealed PDF
                      </a>
                    )}
                    {m.sealed.hasCertificateFile && (
                      <a
                        href={`/api/documents/${m.sealed.documentId}/certificate`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Certificate
                      </a>
                    )}
                    <a
                      href={`/api/documents/${m.sealed.documentId}/badge`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Badge image
                    </a>
                  </div>
                )}
                {(m.confirm || m.link) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.link && (
                      <a
                        href={m.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        {m.link.label}
                      </a>
                    )}
                    {m.confirm && (
                      <>
                        <Button type="button" variant="cta" size="sm" disabled={loading} onClick={() => confirmAction(i, m.confirm!)}>
                          {m.confirm.tool === "save_as_template" ? "Save now" : m.confirm.tool === "seal_document" ? "Seal it" : "Confirm send"}
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
                      </>
                    )}
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
            // bottom-36 is the fallback/first-paint guess (2026-08-01, was
            // bottom-28 before that — just barely clearing the fixed
            // composer's resting height; a multi-line draft or a notch
            // phone's safe-area inset grows the composer past that and
            // covers half the button). Now overridden by the same measured
            // composerOverlapPx the scroll container's padding uses, so
            // this stays pinned just above the composer at whatever height
            // it's actually rendering at. lg:bottom-2 untouched — the
            // composer's back in normal flow there, not fixed, so there's
            // nothing for this to clear (composerOverlapPx is null at lg:,
            // so the inline style is omitted and the Tailwind class wins).
            className="absolute bottom-36 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-neutral-800/90 text-white shadow-lg backdrop-blur hover:bg-neutral-700 lg:bottom-2"
            style={composerOverlapPx !== null ? { bottom: composerOverlapPx } : undefined}
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
          (Shift+Enter for a literal newline), unchanged from before.

          Always pinned to the true bottom of the screen on mobile
          (2026-07-31, direct ask) — below `lg:` this switches from sitting
          in normal flow to `fixed inset-x-0 bottom-0`, so it stays put
          regardless of how far the message list is scrolled or how tall
          the page's own content is, rather than just being "the last thing
          in a bounded column" the way it already was on desktop. Squared
          corners + full-bleed width + a safe-area bottom inset (home
          indicator / gesture bar) while fixed; reverts to the original
          rounded floating bar once back in flow at lg:. */}
      <div
        ref={composerRef}
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-white/10 bg-neutral-950/95 px-4 pt-3 backdrop-blur-sm [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)] lg:static lg:z-auto lg:mt-3 lg:rounded-2xl lg:border lg:bg-neutral-900 lg:px-4 lg:py-3 lg:[padding-bottom:0.75rem] lg:backdrop-blur-none"
      >
        <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFileSelected} className="hidden" />
        <input ref={templateFileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleTemplateFileSelected} className="hidden" />
        <input ref={verifiedBadgeFileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleVerifiedBadgeFileSelected} className="hidden" />
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
          // bg-white/[0.04] (2026-08-01, direct ask) — was bg-transparent,
          // so the entry area was indistinguishable from the composer bar
          // around it with nothing marking where to type. A very slightly
          // lighter panel than the surrounding neutral-950/neutral-900,
          // same tint level already used for other dark-theme panels in
          // console (see console-usage-panel.tsx).
          className="max-h-40 min-h-[52px] w-full resize-none rounded-xl bg-white/[0.04] px-3 py-2.5 text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              type="button"
              aria-label="Attach a recipient list or upload a template"
              title="Attach a recipient list or upload a template"
              disabled={loading}
              onClick={() => {
                dismissPaperclipIntro();
                setAttachMenuOpen((open) => !open);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* First-use popover (2026-07-31, direct ask) — the paperclip
                previously only had a browser `title` tooltip, which needs a
                mouse hover and so is invisible on mobile (no hover at all)
                and easy to miss on desktop. Opens upward with a caret
                pointing at the icon, since the composer this lives in sits
                at the very bottom of the screen (fixed on mobile) with no
                room to open downward. */}
            {paperclipIntroOpen && !attachMenuOpen && (
              <div className="absolute bottom-full left-0 z-10 mb-3 w-64">
                <div className="rounded-2xl border border-white/10 bg-neutral-900 p-3.5 shadow-2xl shadow-black/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">Attach a file</p>
                    <button
                      type="button"
                      onClick={dismissPaperclipIntro}
                      aria-label="Dismiss"
                      className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-neutral-500 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                    Attach a .csv or .txt recipient list to bulk-send, or upload a PDF to use as a new template.
                  </p>
                </div>
                <div className="ml-4 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-neutral-900" />
              </div>
            )}

            {/* Attach menu (2026-08-01, direct ask) — the paperclip used to
                go straight to the recipient-list file picker; a PDF upload
                needs an entirely different handler (handleTemplateFileSelected
                above), so it's now a choice between the two rather than one
                click doing double duty. The full-screen backdrop closes the
                menu on an outside click/tap without needing a ref-based
                click-outside hook. */}
            {attachMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAttachMenuOpen(false)} />
                {/* Order + labels (2026-08-02, direct ask): Verified Badge
                    first, template second, recipient list third — reversed
                    from the original build order, which put recipient list
                    first since that was the paperclip's only option before
                    "Upload a template"/"Get a Verified Badge" were added on
                    top of it. Labels reworded to spell out what each does
                    rather than name the file type. */}
                <div className="absolute bottom-full left-0 z-20 mb-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/60">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(false);
                      verifiedBadgeFileInputRef.current?.click();
                    }}
                    className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left hover:bg-white/5"
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-white">Get a Verified Badge for proof</span>
                      <span className="block text-xs text-neutral-400">.pdf, seal a finished file with a scannable proof badge</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(false);
                      templateFileInputRef.current?.click();
                    }}
                    className="flex w-full items-start gap-2.5 border-t border-white/5 px-3.5 py-3 text-left hover:bg-white/5"
                  >
                    <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-white">Upload a template to sign</span>
                      <span className="block text-xs text-neutral-400">.pdf, becomes a reusable template</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-start gap-2.5 border-t border-white/5 px-3.5 py-3 text-left hover:bg-white/5"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-white">Upload a list of signers</span>
                      <span className="block text-xs text-neutral-400">.csv or .txt, for a bulk send</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
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
