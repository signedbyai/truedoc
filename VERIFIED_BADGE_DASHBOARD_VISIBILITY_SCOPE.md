# Verified Badge visibility in the main dashboard — scope

## BUILT — 2026-08-04: Verified Badge seals now excluded from the dashboard

Direct instruction, implemented: `documents.is_verified_badge = false`
filter added to all three dashboard document queries — the documents list
(`dashboard/documents/page.tsx`), and both dashboard-home queries
(`dashboard/page.tsx`'s recent-documents widget and its status-tally
stats card). A Verified Badge seal no longer appears in the list, the
home widget, or the completed/sent stats count. Deploy owed, same as
everything else this session. The detail page
(`dashboard/documents/[id]/page.tsx`) was left untouched — a sealed
document is no longer *linked* from anywhere in the dashboard, so this
wasn't required to satisfy "stop showing up"; a saved/direct URL would
still open it. Flagging in case that gap should be closed too, not
assumed either way.

## REVERSED — 2026-08-04, Michael, same day as the decisions below

Direct instruction, after seeing the plan locked in: **keep Verified Badge
reporting completely out of the Signing Dashboard — "it's just too
confusing."** Everything below this note (parts A/B/C, the provenance
decision) is now dead — kept for the record, not to be built. New
direction: Verified Badge stays a Console-only story, creation and
reporting both. See `CONSOLE_VERIFIED_BADGE_PROVENANCE_SCOPE.md` for where
this picks up.

**Real tension this reopens, flagged rather than silently resolved:** the
paused "Add a Verified Badge tab to `/dashboard/documents/new`" work
(mentioned throughout this doc as a companion piece) put the *creation*
entry point in the dashboard too. If Verified Badge reporting doesn't
belong in the Signing Dashboard because mixing the two products is
confusing, the same argument plausibly applies to a Verified Badge upload
tab sitting next to "Sign a file"/Magic Quote/AI Drafter — that's a second
half of the same product mixed into the dashboard, not just the reporting
half. This also lines up with the already-decided `CONSOLE_DASHBOARD_ENTRY_
SCOPE.md` work (B2 + the one-time home-page card), which exists specifically
to route people from the dashboard *into* Console for Verified Badge rather
than reproducing it there. Worth an explicit call on whether the paused New
Document tab idea should be dropped in favor of "Console is the only
Verified Badge entry point, reached via B2/C" — not assumed here either
way.

---

Status: SCOPED — DECISIONS LOCKED, NOT BUILT. Companion/prerequisite to the paused "Add a
Verified Badge tab to New Document" work — this is the "save the link to
the outputs in the document details" half of that ask, scoped on its own
first per direct request, since it turns out to matter regardless of
whether that new tab ever ships (Console can already seal documents today).

## Question 1: do documents sealed via Console already show up in the dashboard?

**Yes — confirmed directly in code, not assumed.** A Verified Badge seal is,
by design, an ordinary `documents` row (`VERIFIED_BADGE_SCOPE.md`'s
"self-sign pivot": the org signs its own document, reusing
documents/signers/audit_events unmodified). Both dashboard surfaces already
query `documents` unfiltered by `is_verified_badge`, so a Console-sealed
document already appears in `/dashboard/documents` (the list) and is fully
viewable at `/dashboard/documents/[id]` today. Nobody has to build
"showing" it — that already works by accident of the shared schema.

**What doesn't work: it's rendered exactly like a real multi-party signed
document, which is actively misleading in several concrete ways.**

- **List page** (`dashboard/documents/page.tsx`) — the query selects only
  `id, title, status, page_count, created_at`. No `is_verified_badge` column
  at all. A sealed document shows the same green "Completed" pill as any
  fully-signed multi-party document — no way to tell them apart from the
  list.
- **Detail page** (`dashboard/documents/[id]/page.tsx`) — the `doc` query
  doesn't select `is_verified_badge`, `certificate_file_path`, or
  `certificate_mode` either. The `status === "completed"` branch renders:
  - "Completed" pill + "Every signer has signed." — technically true but
    a strange way to describe a self-seal.
  - A "Signers" card showing one row: the org's own identity-verified name/
    email, marked "Signed." Reads like there was a real second party.
  - **A real, confirmed bug for `certificate_mode: "separate"` seals:** the
    "Download signed PDF" button falls back to "Signed PDF pending…" when
    `signed_file_path` is null — which for "separate" mode is *permanent*,
    not pending, since that mode deliberately has no signed-file artifact
    (only a standalone certificate, per `verified-badge-actions.ts`'s
    `certKey` branch). Today a "separate"-mode seal shows "Signed PDF
    pending…" forever with no explanation and no way to reach the file that
    *does* exist.
  - **No certificate download link at all**, even when
    `certificate_file_path` is set (separate/both modes) — the one output
    those modes exist to produce is unreachable from this page.
  - **The `/verify` link is generic**, pointing at the plain search page,
    not the specific `/verify?hash=...` deep link this exact document
    already has (the hash lives on the `completed` audit event's
    `document_hash` column, already fetched by this page's own
    `auditEvents` query — just not read).
  - **Audit trail reads wrong for a self-seal.** `describeEvent()` in
    `audit-trail.tsx` has no idea `metadata.verified_badge`/`self_sign`
    exist — a sealed document's history literally says "Sent for signature
    to 1 signer," "[identity name] agreed to sign electronically," "[identity
    name] signed," none of which happened the way that reads. This is the
    direct cause of the second half of your original ask (document history
    should say "uploaded" and "verified," not this).
- **Provenance is captured but never shown, anywhere.** `auditProvenance()`
  already writes `via_console: true` or `via_mcp: true, agent_triggered:
  true` into the `created`/`sent` events' metadata — confirmed via grep,
  this is written by `console-actions.ts` and read only by
  `developers/page.tsx` (API docs copy) and `api/mcp/route.ts` (setting the
  flag), never rendered in the dashboard UI. A sender has no way to tell,
  today, whether a document in their list was sent from the dashboard,
  Console, or an MCP agent.

## Scope, in three parts

### A — Provenance: a real third value, and actually showing it

`auditProvenance(source: "console" | "mcp")` in `console-actions.ts` needs
a third case for a dashboard-originated seal (or any dashboard-originated
document, if this is generalized — see open question below), returning
something like `{ via_dashboard: true }` for symmetry with the existing two.
`sealDocumentAction`'s own `source: "console" | "mcp"` param in
`verified-badge-actions.ts` needs the same widening.

Once captured, it needs an actual UI surface — right now nothing reads
these flags. Cheapest option: one line in the audit trail's `created` event
description ("Uploaded from the dashboard" / "Sealed via Console" / "Sealed
via an MCP agent"), since that event already carries the metadata and the
audit trail is already the place document history lives. A badge/pill on
the list or detail page is a heavier alternative — worth deciding once, not
mixing both.

### B — Sealed outputs, actually linked

Detail page's `doc` query needs `is_verified_badge, certificate_file_path,
certificate_mode` added, and the `auditEvents` query needs `document_hash`
added (already fetched for the audit trail, just not selected). Then, when
`doc.is_verified_badge` is true:

- Swap the generic "Completed" framing for something that reads as a seal,
  not a multi-party signature (exact copy TBD — "Verified" status pill is
  the obvious minimum).
- Fix the "separate" mode bug: only show "Download signed PDF" when
  `hasSignedFile` is actually true for this seal (i.e. `certificate_mode !==
  "separate"`), not "pending" forever.
- Add "Download certificate" whenever `certificate_file_path` is set —
  wired to the existing `/api/documents/[id]/certificate` route, which
  already exists and is already used by Console's own chat UI, just never
  linked from here.
- Replace the generic `/verify` link with the real
  `/verify?hash=${document_hash}` deep link, once `document_hash` is
  selected.
- Worth a call: keep or hide the "Signers" card for a self-seal — showing
  the org's own identity-verified name/email as "the signer" is confusing
  once the page otherwise reads as "this is a seal, not a signature."

### C — Audit trail: verified-badge-aware event descriptions

`describeEvent()` needs to branch on `event.metadata?.verified_badge` /
`event.metadata?.self_sign`:

- `created` with `verified_badge` → **"Uploaded"** (your literal ask).
- `completed` with `verified_badge` → **"Verified and sealed"** (your
  literal ask), not "Completed — every signer has signed."
- `sent` / `consent_given` / `signed` with `self_sign` → these three fire
  back-to-back with no real time gap and describe an internal mechanic, not
  something a reader needs — recommend suppressing them from the rendered
  trail entirely for a verified-badge document, so the history reads as
  exactly the two moments you asked for: uploaded, then verified. (Keeping
  them but relabeling is the fallback if you'd rather see every event no
  matter what.)

## Decision — 2026-08-04, Michael

**Narrow.** Only Verified Badge seals get a `source` value (dashboard/
console/mcp) — a plain "Sign a file"/Magic Quote/AI Drafter document never
shows provenance, same as today. Matches the actual motivating case;
`auditProvenance()` stays scoped to `console-actions.ts` and
`verified-badge-actions.ts`'s existing call sites plus the one new
dashboard-seal call site, nothing added to the plain upload/quote/draft
finalize routes.

## How to apply

Scoped only. Once built, this closes the "save the link to the outputs in
the document details" and "document history says when uploaded/verified"
halves of the paused Verified Badge tab work — that work can resume on top
of this rather than duplicating it.
