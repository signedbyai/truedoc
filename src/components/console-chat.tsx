"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { ArrowUp, Check, ChevronDown, Copy, ExternalLink, FileText, FileUp, Paperclip, ShieldCheck, Square, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleShareLinkButton, ConsoleQrLinkButton } from "@/components/console-link-actions";
import { parseNdjsonLine, splitNdjsonLines } from "@/lib/ndjson";
import { formatCreditPackPrice, type Currency } from "@/lib/currency";
import type { ConsoleHeroIconColor } from "@/flags";

// Which control actually opened the file picker / received the drop for a
// Verified Badge seal (CONSOLE_VERIFIED_BADGE_FOCUS_REDESIGN_SCOPE.md,
// 2026-08-04) — carried through to the seal's own audit event metadata
// (see verified-badge-actions.ts) so "which of the three do people use"
// is answerable with a single grouped query, and also fired as a
// "console_upload_started" analytics event (see sealSelectedFile below)
// for the icon-color test's upload-start metric.
type EntryPoint = "dropzone" | "seal_button" | "paperclip";

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
      certificateModeChoice?: { documentId: string; filename: string; entryPoint: EntryPoint };
      // seal_document's result (2026-08-01, direct feedback) — renders a
      // copy-link button plus inline download buttons for whichever files
      // this seal actually produced, instead of the raw verify URL and a
      // pointer to the documents list.
      sealed?: { documentId: string; verifyUrl: string; hasSignedFile: boolean; hasCertificateFile: boolean };
      // Free-plan doc-cap hit (2026-08-02, CONSOLE_FREE_TIER_SCOPE.md's
      // "cap-hit moment" addendum) — set when an upload's presign/finalize
      // call comes back with `upgrade: true` (checkFreePlanDocCap's 402).
      // Previously this just fell through to the small red error line like
      // any other failure; a real limit worth a real CTA gets its own
      // bubble with an "Upgrade to Pro" button instead, same visual
      // treatment as certificateModeChoice/sealed above rather than plain
      // text buried in the thread.
      capReached?: boolean;
      // seal_document's needs-identity-verification failure (2026-08-01,
      // direct bug report: this used to be plain text telling someone to
      // "open Settings," with nothing actually clickable — the only nearby
      // interactive element was the "Get a Verified Badge" attach button,
      // so trying to act on the instruction just reopened the file picker
      // instead of going anywhere near identity verification). Renders a
      // real "Open Settings" button wired to the onOpenSettings prop.
      openSettings?: boolean;
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
  plan = "free",
  currency = "USD",
  onOpenSettings,
  heroIconVariant = "blue",
  sealCapReached = false,
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
  /** Org's plan (2026-08-02, CONSOLE_FREE_TIER_SCOPE.md) — Free orgs have
   *  console access now, but send/bulk-send still require an existing
   *  template (the `templates` feature, unchanged, Pro+-only — see
   *  plan.ts's consoleAccess comment), so a Free org's only real console
   *  action is Verified Badge sealing. Everything below keyed off
   *  `isFreePlan` hides the template-upload/recipient-list paperclip
   *  options and the composer copy that references them, rather than
   *  showing choices that would just dead-end at "Templates are a Pro plan
   *  feature." Defaults to "free" (the safer default if this prop is ever
   *  omitted — undershows options rather than over-promising them). */
  plan?: string;
  /** Resolved visitor currency (2026-08-01, direct bug report: the "Buy 25
   *  more" credit-pack button said a hardcoded "$5" regardless of where
   *  the visitor actually was, which could disagree with what checkout
   *  charges once that route became currency-aware — see stripe.ts's
   *  creditPackPriceFor). Same getRequestCurrency() resolution the
   *  checkout route itself uses, threaded down from console/app/page.tsx.
   *  Defaults to USD, same as every other currency-aware surface in this
   *  app when nothing else is known. */
  currency?: Currency;
  /** Switches console-workspace.tsx's own Settings tab open (desktop
   *  aside and mobile sheet both — that parent decides which is actually
   *  visible; see its own onOpenSettings wiring). Used by the
   *  needs_identity bubble's "Open Settings" button (2026-08-01, direct
   *  bug report) so that flow can actually navigate there instead of just
   *  telling someone to. */
  onOpenSettings?: () => void;
  /** Empty-state hero icon color test (2026-08-04, CONSOLE_VERIFIED_BADGE_
   *  FOCUS_REDESIGN_SCOPE.md) — resolved server-side via consoleHeroIconFlag
   *  and threaded straight through from console/app/page.tsx via
   *  console-workspace.tsx. Defaults to "blue", same fallback posture as
   *  every other prop here that has a real default value. */
  heroIconVariant?: ConsoleHeroIconColor;
  /** Server-computed at page load from getFreePlanUsage (2026-08-05, direct
   *  ask — same reasoning as new-document-client.tsx's sendCapReached
   *  prop). Real enforcement is checkFreePlanSealCap inside
   *  sealDocumentAction, which fires at the confirm step and renders as the
   *  capReached bubble (see confirmAction's `data.type === "capReached"`
   *  branch); this is a read-only, non-blocking courtesy check so a Free
   *  org that's already sealed 3 documents this month sees the same bubble
   *  immediately on file-select, before spending a Mistral round trip and a
   *  confirm click on something that's going to be capped anyway. Can go
   *  stale within a session (e.g. sealing in another tab) — harmless, since
   *  sealDocumentAction always re-checks for real. */
  sealCapReached?: boolean;
} = {}) {
  const isFreePlan = plan === "free";
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
  // Visual feedback only, no logic depends on it — hero dropzone
  // (2026-08-04) border/background highlight while a file is dragged over.
  const [heroDragActive, setHeroDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const verifiedBadgeFileInputRef = useRef<HTMLInputElement>(null);
  // Set immediately before verifiedBadgeFileInputRef is opened (or read
  // directly on a real drop) so handleVerifiedBadgeFileSelected/
  // sealSelectedFile below know which of the three entry points this
  // upload came from — see the EntryPoint type doc comment up top.
  const pendingEntryPointRef = useRef<EntryPoint>("paperclip");
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
      } else if (data.type === "needs_identity") {
        setMessages((cur) => [
          ...cur,
          { role: "assistant", content: String(data.content ?? ""), openSettings: true },
        ]);
      } else if (data.type === "capReached") {
        // seal_document hit the Free plan's 3-seals/month cap (2026-08-05,
        // separate from the upload-time cap-hit reportUploadError renders
        // below — sealing no longer has one, this is the seal-time
        // equivalent) — same capReached bubble treatment either way.
        setMessages((cur) => [...cur, { role: "assistant", content: String(data.content ?? ""), capReached: true }]);
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
    mode: "appended" | "separate" | "both",
    entryPoint: EntryPoint
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
          confirm: { tool: "seal_document", arguments: { document_id: documentId, certificate_mode: mode, entry_point: entryPoint } },
        },
      ];
    });
  }

  /** "Upgrade to Pro" button on a capReached bubble (see
   *  handleVerifiedBadgeFileSelected/handleTemplateFileSelected below) —
   *  starts a real Stripe Checkout session and redirects there, the exact
   *  same client-side call pricing-cards.tsx's own subscribe() makes
   *  (POST /api/billing/checkout {plan}, then window.location.href the
   *  returned url).
   *
   *  `source: "console"` (2026-08-05, direct bug report: Checkout's own
   *  back arrow took someone all the way out of console.signedby.ai and
   *  back to the root signedby.ai domain) — same fix, same reasoning as
   *  buyCreditPack's own `source: "console"` below: without it, the route
   *  falls back to its default /dashboard/billing success/cancel URLs,
   *  which sit on the main domain. Now lands back on console.signedby.ai/app
   *  either way (success or cancel) instead. */
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  async function subscribeToPro() {
    setError("");
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter", source: "console" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setUpgradeLoading(false);
    }
  }

  /** "Buy 25 more ($5)" button on a capReached bubble, next to Upgrade to
   *  Pro — the credit-pack top-up (CONSOLE_FREE_TIER_SCOPE.md item #8,
   *  built 2026-08-03). Same shape as subscribeToPro above (POST, redirect
   *  to the returned Checkout url) but against the one-time-payment route
   *  instead of the subscription one.
   *
   *  `source: "console"` (2026-08-01, direct bug report) — without this,
   *  Stripe Checkout's back arrow used the route's default
   *  /dashboard/billing cancel_url, which sits on the main signedby.ai
   *  domain and so silently exited console.signedby.ai entirely when
   *  clicked. See the route's own bodySchema comment. */
  const [creditsLoading, setCreditsLoading] = useState(false);
  async function buyCreditPack() {
    setError("");
    setCreditsLoading(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "console" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCreditsLoading(false);
    }
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
  /** Shared by handleTemplateFileSelected/handleVerifiedBadgeFileSelected's
   *  upload-url and finalize error branches. Originally (2026-08-02,
   *  CONSOLE_FREE_TIER_SCOPE.md's "cap-hit moment" addendum) this is where a
   *  hit free-plan cap turned into the capReached bubble, back when
   *  checkFreePlanDocCap ran at upload time. As of 2026-08-05 the cap moved
   *  to each action's actual completion (send/seal — see plan.ts), so
   *  upload-url/finalize never set `upgrade: true` any more and this
   *  function's `data.upgrade` branch is effectively dormant for both
   *  callers — the real capReached moment for Verified Badge uploads is now
   *  in confirmAction's `data.type === "capReached"` branch above, which
   *  fires off seal_document's own result instead. Left in place rather
   *  than deleted: harmless, and correct if either route were ever given a
   *  reason to set `upgrade: true` again for some other check. */
  function reportUploadError(data: { error?: string; upgrade?: boolean }, fallback: string) {
    if (data.upgrade) {
      setMessages((cur) => [...cur, { role: "assistant", content: data.error || fallback, capReached: true }]);
    } else {
      setError(data.error || fallback);
    }
  }

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
        reportUploadError(presign, "Couldn't start the upload.");
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
        reportUploadError(finalize, "Couldn't save the upload.");
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
   *  preference.
   *
   *  Split into this shared core plus three thin call sites (2026-08-04,
   *  CONSOLE_VERIFIED_BADGE_FOCUS_REDESIGN_SCOPE.md) — the paperclip's
   *  hidden-input onChange (handleVerifiedBadgeFileSelected below), the new
   *  hero dropzone's onDrop, and the new "Seal this file" button, which all
   *  now feed the exact same upload/confirm plumbing rather than each
   *  having their own copy — the only thing that differs per entry point is
   *  which value gets recorded, not how the seal itself works. That was a
   *  direct decision: reuse the existing chat-confirm flow rather than
   *  build a second, more direct seal path. */
  async function sealSelectedFile(file: File, entryPoint: EntryPoint) {
    if (loading) return;
    setError("");

    // Skip straight to the capReached bubble (2026-08-05, direct ask) — see
    // sealCapReached's doc comment. No network call, no Mistral round trip;
    // sealDocumentAction re-checks for real once an actual confirm happens.
    if (sealCapReached) {
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "You've hit the Free plan's 3 Verified Badge seals/month limit. Upgrade to keep going.",
          capReached: true,
        },
      ]);
      return;
    }

    if (!/\.pdf$/i.test(file.name)) {
      setError("Please attach a PDF to seal.");
      return;
    }
    if (file.size > MAX_TEMPLATE_FILE_BYTES) {
      setError("That file's too large — try one under 25MB.");
      return;
    }

    // Fired on every real attempt, not just successful ones — the
    // icon-color test's metric is upload-start, and an abandoned upload
    // (e.g. a bad file type caught above) still tells us which entry
    // point someone reached for first. See flags.ts's consoleHeroIconFlag.
    track("console_upload_started", { entry_point: entryPoint, icon_variant: heroIconVariant });

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
        reportUploadError(presign, "Couldn't start the upload.");
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
        reportUploadError(finalize, "Couldn't save the upload.");
        return;
      }
      const documentId = String(finalize.id);

      const userBubble: Bubble = { role: "user", content: `Uploaded "${file.name}" to seal as a Verified Badge.` };
      let assistantBubble: Bubble;

      if (certificateModePreference === "ask") {
        assistantBubble = {
          role: "assistant",
          content: `Got "${file.name}." Want the certificate appended to the file, kept as a separate document, or both? (Change the default any time in Settings.)`,
          certificateModeChoice: { documentId, filename: file.name, entryPoint },
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
          confirm: {
            tool: "seal_document",
            arguments: { document_id: documentId, certificate_mode: certificateModePreference, entry_point: entryPoint },
          },
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

  /** Thin wrapper around sealSelectedFile for the hidden file input's own
   *  onChange — shared by the paperclip attach-menu button, the hero
   *  dropzone's click-to-browse, and the "Seal this file" button, all of
   *  which set pendingEntryPointRef immediately before opening this same
   *  input rather than each managing their own file input. */
  async function handleVerifiedBadgeFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await sealSelectedFile(file, pendingEntryPointRef.current);
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
          {/* Upload-first hero (2026-08-04, CONSOLE_VERIFIED_BADGE_FOCUS_
              REDESIGN_SCOPE.md) — replaces the 2026-08-02 promo block, which
              only ever told people where the paperclip was rather than
              putting an upload target in front of them. Direct goal: get
              someone uploading a file immediately on first use. Three entry
              points now feed the exact same sealSelectedFile flow (see that
              function's own doc comment) — a real drag-and-drop dropzone, a
              "Seal this file" button under it that also just opens the file
              picker, and the composer's paperclip below, unchanged — shown
              together rather than split-tested, so entry_point (threaded
              into the seal's own audit metadata) can answer which one
              people actually reach for. Icon color (blue vs. yellow) is a
              real, separate flag-driven test — see heroIconVariant's prop
              doc and flags.ts's consoleHeroIconFlag. */}
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-black/40 ${
                  heroIconVariant === "yellow" ? "bg-yellow-300" : "bg-[#142040]"
                }`}
              >
                <ShieldCheck className={`h-7 w-7 ${heroIconVariant === "yellow" ? "text-slate-900" : "text-[#7cb2f9]"}`} aria-hidden="true" />
              </div>

              <h2 className="text-base font-medium text-white">
                {isFreePlan ? "Claim your free Verified Badge" : "Generate your Verified Badge"}
              </h2>
              <p className="max-w-xs text-sm text-neutral-400">
                Seal your first file to generate cryptographic proof it&apos;s unaltered and identity-verified.
              </p>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setHeroDragActive(true);
                }}
                onDragLeave={() => setHeroDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHeroDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void sealSelectedFile(file, "dropzone");
                }}
                className={`mt-1 flex w-full max-w-xs cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-6 text-center transition-colors ${
                  heroDragActive ? "border-white/40 bg-white/5" : "border-white/20"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void sealSelectedFile(file, "dropzone");
                  }}
                />
                <UploadCloud className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                <p className="text-xs font-medium text-white">Drop a file, or tap to browse</p>
              </label>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  pendingEntryPointRef.current = "seal_button";
                  verifiedBadgeFileInputRef.current?.click();
                }}
                className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-yellow-300 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-yellow-200 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Seal this file
              </button>

              <p className="text-[11px] text-neutral-600">Secured via SHA-512</p>

              {/* Free plan (2026-08-02, CONSOLE_FREE_TIER_SCOPE.md): this
                  line used to promise send/bulk-send/status/void, none of
                  which Free can actually reach (they need an existing
                  template, and template-saving is Pro+-only) — showing it
                  would just set up a dead end. Free's real console value is
                  Verified Badge sealing, already the headline above. */}
              {!isFreePlan && (
                <p className="mt-1 max-w-xs text-xs text-neutral-600">
                  Or just tell me what you need — send, bulk-send, check status, or void, e.g. &ldquo;send the NDA
                  template to jane@acme.com&rdquo;.
                </p>
              )}
            </div>
          )}
          {/* text-base (2026-07-31, direct feedback: response text was too
              small to read comfortably) — was text-sm on both bubble types. */}
          {/* Initial top clearance, mobile only (2026-08-05, direct ask) —
              generalizes the capReached-bubble-specific `mt-10 lg:mt-0` fix
              below into a single spacer ahead of the whole list, since the
              actual problem was never specific to that one bubble type: in
              a short conversation ANY first (or second) message lands right
              under the floating mobile pill nav, buttons/text half-covered.
              A blanket top-padding on the scroll container itself was
              deliberately avoided (see console-workspace.tsx's own
              "no reserved top padding" comment) — that recreates the exact
              solid-bar look the pill design replaced. This is narrower:
              only present once, only before the first real message, and
              only on mobile (lg:hidden) where the pill actually floats. */}
          {messages.length > 0 && <div className="h-10 shrink-0 lg:hidden" aria-hidden="true" />}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-2.5 text-base text-white">
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                className="mr-auto max-w-[90%] text-base leading-relaxed text-neutral-200"
              >
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
                        onClick={() =>
                          chooseCertificateMode(
                            i,
                            m.certificateModeChoice!.documentId,
                            m.certificateModeChoice!.filename,
                            mode,
                            m.certificateModeChoice!.entryPoint
                          )
                        }
                      >
                        {mode === "appended" ? "Appended" : mode === "separate" ? "Separate" : "Both"}
                      </Button>
                    ))}
                  </div>
                )}
                {m.sealed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyLinkButton value={m.sealed.verifyUrl} label="Copy verify link" />
                    <ConsoleShareLinkButton
                      link={m.sealed.verifyUrl}
                      shareText="Here's the verification link for this document:"
                    />
                    <ConsoleQrLinkButton
                      link={m.sealed.verifyUrl}
                      caption="Their camera opens this document's verification page."
                    />
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
                {m.capReached && (
                  // console-native equivalent of new-document-client.tsx's
                  // dashboard cap-hit card (2026-08-05) — same two options,
                  // same equal-width pairing, adapted for this dark chat
                  // surface instead of a light bordered card (a light-bg
                  // card would look out of place here — see the older
                  // comment this replaced). Order/emphasis deliberately
                  // reversed from the dashboard version (Upgrade to Pro
                  // first there): here Top up leads and gets the highlighted
                  // `cta` treatment, Upgrade to Pro is the secondary/bordered
                  // option, per direct ask. No "view pricing plans" link
                  // (direct ask — dashboard's is dropped here on purpose,
                  // not an oversight) and no per-doc overage rate on
                  // Upgrade to Pro's subtext (direct ask: "the top up
                  // numbers already tell that story" — +25 docs at a known
                  // price already conveys the economics without also
                  // spelling out $/doc on the other button).
                  <div className="mt-2 flex gap-2">
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <Button
                        type="button"
                        variant="cta"
                        size="sm"
                        disabled={creditsLoading}
                        onClick={buyCreditPack}
                        className="w-full"
                      >
                        {creditsLoading ? "Starting checkout…" : "Top up"}
                      </Button>
                      <p className="text-[11px] text-neutral-500">+25 docs {formatCreditPackPrice(currency)}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={upgradeLoading}
                        onClick={subscribeToPro}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {upgradeLoading ? "Starting checkout…" : "Upgrade to Pro"}
                      </button>
                      {/* No price here (2026-08-05, direct ask) — the Top up
                          button already states its own price, and this
                          bubble's job is just "here's what Pro unlocks," not
                          a second place to repeat the plan's cost. Matches
                          CONSOLE_FREE_ALLOWANCE (console-usage.ts) — keep
                          these in sync if that constant changes again. */}
                      <p className="text-[11px] text-neutral-500">100 seals included</p>
                    </div>
                  </div>
                )}
                {(m.confirm || m.link || m.openSettings) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.openSettings && (
                      <Button type="button" variant="cta" size="sm" onClick={() => onOpenSettings?.()}>
                        Open Settings
                      </Button>
                    )}
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
          placeholder={
            isFreePlan
              ? "Upload a document to get a Verified Badge for proof…"
              : // Shortened 2026-08-03, direct ask ("so it fits") — the
                // original 103-char string wrapped past what this 2-row
                // textarea shows before getting clipped. Also dropped the
                // "Upload a document to" lead-in Free plan keeps: it read
                // fine when there was only one destination (upload ->
                // badge), but didn't grammatically cover "check status"
                // once Pro+ listed three parallel actions — three plain
                // verb phrases reads better than one mismatched one.
                "Get a Verified Badge, bulk sign with templates, or check status…"
          }
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
              aria-label={isFreePlan ? "Get a Verified Badge for proof" : "Attach a recipient list or upload a template"}
              title={isFreePlan ? "Get a Verified Badge for proof" : "Attach a recipient list or upload a template"}
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
                room to open downward. Free plan (2026-08-02): still opens
                the menu below on click, same as every other plan — direct
                feedback that a single-option menu is still worth keeping
                (vs. jumping straight to the file picker) so someone can
                see what they're about to do before committing to it, not
                just for plans with an actual choice to make. This tooltip's
                own copy is free-plan-aware for the same reason. */}
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
                    {isFreePlan
                      ? "Attach a PDF to seal it with a scannable Verified Badge — proof it's unaltered and identity-verified."
                      : "Attach a .csv or .txt recipient list to bulk-send, or upload a PDF to use as a new template."}
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
                click-outside hook.

                Free plan (2026-08-02, direct feedback): still shows this
                menu — just with only the Verified Badge option, since
                template upload and recipient-list attach both require the
                Pro+-only `templates` feature. Kept as a single-item menu
                rather than skipping straight to the file picker on click,
                so someone still sees what they're about to do (the
                description line) before committing, the same as every
                other plan gets. */}
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
                      pendingEntryPointRef.current = "paperclip";
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
                  {!isFreePlan && (
                    <>
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
                    </>
                  )}
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
