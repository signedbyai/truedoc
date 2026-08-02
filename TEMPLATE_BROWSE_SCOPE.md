# Console template browsing + return-to-conversation — scope

Status: BUILT 2026-08-02 — Option A, direct instruction ("go with A"). The
conversation-resume fix, the Templates tab (desktop pill switcher +
mobile sheet tab), and the auto-discard-on-preview flow described below are
all implemented, tsc/eslint clean, full 553-test suite passing. Still needs
push/deploy (sandbox has no git push credentials). Option B (edit the
template directly, no document spawned) was explicitly not built — see the
"View on A vs B" reasoning below, kept for the record since it's a real
decision, not an oversight. The template-card content (party count, usage
tracking, thumbnails) section also reflects what actually shipped vs. what's
still just scoped.

**Recommendation given, decision made:** A over B, specifically because of
`field-editor.tsx`'s bug history — every field-assignment bug this session
and last (null signer_id, save-as-template role fallback, duplicate
suggested fields, drag snap-back) lived in that exact file's field/role/
signer machinery, which B would need a second parallel version of. A reuses
the field editor completely unchanged, so every hardening pass already
applied to it (including today's zero-fields fix) covers this feature for
free. A's one real downside — draft-document litter — is solved separately
below (auto-discard) rather than by reaching for B.

## Why this one

Grew out of the field-loss bug fix earlier today (see
`TEMPLATE_SEND_ZERO_FIELDS` work / `field-assignment-bug-history` memory)
and the console-return-flow (floating "Back to Console" button) built just
before it. Once that button existed, the obvious next question was whether
it actually does what it looks like it does — it doesn't, fully. That gap is
the real prerequisite for this feature, not a footnote.

## Current state, grounded in code

**No clickable template list exists anywhere in Console today.** A user can
ask "what templates do I have" and the model will answer in prose (via
`listTemplatesAction` in `console-actions.ts`, which returns bare `{id,
name}` pairs — no field count, party count, or last-used date), but nothing
in that reply is clickable. The only two ways a template ever becomes
visible in Console are: (1) uploading a new PDF, which either inline-saves
via a "Save now" confirm bubble (single party) or links out to the field
editor (`m.link`, multi-party or unreadable) — `console-chat.tsx` lines
~966-991; (2) asking to send an existing template by name, which never
shows you the template itself, just executes a send.

**"Back to Console" does not resume the conversation you were in — and
understanding exactly why matters for what to build.** The "Review fields" /
"Open in editor" link Console renders (`m.link`) already opens in a new tab
(`target="_blank" rel="noreferrer"`, confirmed in `console-chat.tsx`
~1224-1233) — so the original console tab, with its full live conversation,
is never actually destroyed. The problem is discoverability and what happens
next:

- On mobile especially, "opened in a background tab" is not obvious — the
  user's mental model is that they navigated away, which is exactly the
  complaint that led to the floating "Back to Console" button.
- `rel="noreferrer"` — kept deliberately for the security reason it exists —
  also suppresses `window.opener` in every modern browser. That means the
  editor tab has **no programmatic handle back to the specific console tab
  it came from**, even in principle. There's no `window.opener.focus()` fix
  available here without removing `noreferrer`, which isn't worth the
  referrer-leak tradeoff for this.
- So "Back to Console" (`field-editor.tsx`'s floating button,
  `window.location.href = consoleAppUrl()`) can only ever open **a**
  console session, never reattach to **the** one the user left — and today
  it opens a blank "New chat," which is worse than doing nothing: the user
  now has the original tab (correct, alive, easy to miss) and a second tab
  that looks like their conversation vanished.

**The fix this feature depends on:** thread the actual `conversationId`
through the same `?from=console` mechanism that already carries
`cameFromConsole`, and give `ConsoleWorkspace` a way to auto-select a
conversation from a URL param on mount.

- `console-chat.tsx`'s upload flow already knows `convIdRef.current` when it
  builds `reviewLink` — extend the href to
  `?from=console&c=${convIdRef.current ?? ""}`.
- `dashboard/documents/[id]/page.tsx`: `searchParams` gains `c?: string`,
  passed to `FieldEditor` as a new `consoleConversationId?: string | null`
  prop alongside the existing `cameFromConsole`.
- `field-editor.tsx`'s "Back to Console" button navigates to
  `${consoleAppUrl()}?c=${consoleConversationId}` instead of the bare
  `consoleAppUrl()`, when that id is present.
- `console-workspace.tsx` reads `?c=` on mount (a `useEffect` reading
  `useSearchParams`, or a server-read prop from `/console/app/page.tsx`) and
  calls the existing `handleSelect(id)` — no new fetch logic needed, it
  already knows how to load a conversation by id, it just never had a reason
  to do so automatically before.

This alone — no template list yet — already delivers "close the editor,
land back in the conversation you were in," just via a second tab that
shows the right thing instead of a blank one. Worth building even if the
list UI below turns out bigger than expected.

**BUILT as described above** — `console-chat.tsx`'s `reviewLink` now
appends `&c=${convIdRef.current}`, `dashboard/documents/[id]/page.tsx` reads
`c` and passes `consoleConversationId` to `FieldEditor`, that component's
"Back to Console" (all three exit points — the pill, the save-reminder
modal's "Go to Console anyway", and the success popover) now navigates to
`consoleAppUrl()?c=<id>` via a `backToConsoleUrl` computed value, and
`console-workspace.tsx` auto-selects that conversation on mount via a
guarded one-shot effect around the existing `handleSelect`.

## The template list itself — two shapes, genuinely undecided

**Option A — a template spawns a document, same as today's "Use template."**
Clicking a template in Console's list calls the existing
`/api/templates/[id]/use` (creates a `status: "draft"` document seeded from
`field_map`, `signer_id` left null / `template_role` set) and opens the
field editor on that draft, `?from=console&c=...` attached. Cheapest to
build — reuses a real, already-shipped route unchanged. Downside: every
"let me just check this template" click leaves behind an orphan draft
document (harmless per `save-as-template/route.ts`'s design — the original
is never mutated — but it's clutter, and it's the same "which one do I keep"
confusion the console-return-flow's save-reminder popover was built to paper
over for the *upload* path; this would reintroduce a milder version of it
for *browsing*).

**Option B — a real "edit this template" surface, no document spawned.**
Field editor gains a mode that edits `templates.field_map` directly (role
numbers, not `signer_id`s — closer to what a template actually is). No
draft-document litter, and it directly answers Michael's original confusion
report ("I saved a template but the name was different to what console was
expecting") by making the console-visible list and the thing you edit the
literal same object, not a document that sometimes becomes a template
afterward.

**Checked 2026-08-02: this is smaller than it first looked.** Neither the
PDF rendering nor the field-position math actually depends on a document
existing:

- `/api/documents/[id]/file/route.ts` is a 25-line passthrough — look up
  `file_path`, stream it from R2 via `getFromR2()`. A template row already
  stores the identical R2 key as `base_file_path` (reused from the original
  upload, never copied). A parallel `/api/templates/[id]/file` route is the
  same lookup pointed at that column instead — no document involved.
- `templates.field_map`'s `x/y/width/height` are already in the exact same
  normalized 0-1 coordinate system `document_fields` uses (that's literally
  how `save-as-template` builds it, a field-by-field copy) — the editor's
  canvas/overlay/drag/resize code doesn't care which table the numbers came
  from.

So the real new work is narrower than "a genuinely new editor surface"
implied: two small new endpoints (the file passthrough above, and a
GET/PATCH pair for `templates.field_map` — `templates/[id]/route.ts`
already exists with just a DELETE handler, a natural place for these), plus
swapping the recipient sidebar from "real signers" to "Party 1 / Party 2"
role slots, since a template has no actual people yet. Canvas rendering,
drag, resize, and AI-suggest are all reused unchanged.

**Decided 2026-08-02: Option A.** Built as described — clicking a template
in the new Templates tab calls `/api/templates/[id]/use` unchanged and
opens the field editor with `?from=console&consoleTemplatePreview=1&c=...`,
the last of which flags the draft as auto-discardable (see the "What
actually shipped" note in the template-card section below, and the
auto-discard mechanism itself: `field-editor.tsx`'s
`discardPreviewDraftIfAny()`, a best-effort `keepalive` DELETE fired before
every Back to Console exit point, relying on `DELETE /api/documents/[id]`'s
existing draft-only guard as the safety net if the user actually sent the
document instead of just previewing it). Option B remains unbuilt, not
rejected outright — see the status line at the top of this doc for the
reasoning.

**Bug found and fixed along the way, independent of this feature but
directly relevant to it:** `DELETE /api/documents/[id]` was unconditionally
purging the R2 file on every draft delete, but any document seeded from a
template (via "Use template", console send, or bulk-send) shares its PDF
with the template itself (`file_path`/`base_file_path` point at the same R2
key, never copied). Deleting such a draft — which the auto-discard feature
above now does routinely — would have silently broken the template and
every sibling document for everyone. Fixed by checking for remaining
`documents.file_path`/`templates.base_file_path` references before purging
R2. This was a latent, pre-existing bug reachable today via the ordinary
dashboard delete-draft button on any "Use template" draft, not something
this feature introduced — just something it would have made far more
likely to hit in practice.

## Where the list would render

Two candidate spots, not mutually exclusive:

1. **A "Templates" tab in the left sidebar**, next to the existing History
   and Settings entries (`console-workspace.tsx`'s `mobileSheetTab` already
   has this exact three-way-tab shape on mobile — desktop currently shows
   History+Settings stacked with no tabs, so this would need its own small
   layout decision there too). Always available, not tied to any particular
   conversation turn.
2. **An inline rendered list the model can produce mid-conversation**, e.g.
   asking "what templates do I have" gets back actual clickable cards
   instead of prose — would need `listTemplatesAction` to come back as a
   new `ConsoleChatTurnResult` variant (same pattern as the existing
   `sealed` type) rather than folded into the model's free-text reply, plus
   `Bubble`/`consoleConversationMessageSchema` gaining a `templateList`
   field (same treatment `link`/`sealed` just got fixed to have — see
   `field-assignment-bug-history`-adjacent lesson from today: anything
   meant to survive a reload has to be in that schema explicitly).

Recommend building #1 regardless of what's decided on #2 — it's the more
reliable, less model-dependent entry point ("click Templates" always works;
"ask the right question" doesn't).

**BUILT: #1 only.** A "Templates" tab now sits next to History — a pill
switcher on desktop (`console-workspace.tsx`'s `desktopHistoryTab` state,
above the existing history list, with Settings/usage/plan-status staying
outside the switcher and always visible per this component's own "Pro-gate"
doc comment) and a third icon in the mobile floating pill/bottom sheet
(`mobileSheetTab` widened from two values to three). #2 (inline
model-rendered clickable list mid-conversation) is not built — `#1` alone
was judged sufficient for this pass.

## What a template card actually shows

Checked against real prior art rather than designed from scratch — the
mockup shown to Michael took some liberties worth being explicit about.

**Already proven, reuse as-is:** `dashboard/templates/page.tsx`'s existing
list (session-authenticated, dashboard-only today) already renders a real
card off one query — `select id, name, page_count, field_map, created_at` —
and shows name, page count, field count (`field_map.length`), and created
date. This is the honest baseline for what a Console template card can show
on day one with zero new tracking.

**Computable now, but not built anywhere yet:** party count — the mockup's
"2 parties" line. It's the same distinct-non-null-role count
`checkSingleSignerRoleCount` already computes on `field_map` for the
bulk-send guard (see `BULK_SEND_TRUST_SCOPE.md`) — cheap to add, just needs
reuse, but no card (dashboard or console) currently surfaces it.

**Genuinely new work, not just a data lookup:**
- *Last-used / times-sent.* No `templates.updated_at`, no usage counter, and
  no `documents.template_id` column — the only link from a sent document
  back to its template is `audit_events.metadata->>'from_template'`, an
  unindexed JSON field on a different table. Showing this on a card means
  either a counter column maintained on every send, or accepting an
  unindexed query per card.
- *A thumbnail.* Nothing in the app renders or caches a page-1 preview
  image today — templates only store a file pointer and field coordinates.
  Doable (render + store at save time) but new infrastructure, not a lookup.
- *Payment/DocGate badges.* Half-free: `payment_link_url`/`docgate_url` are
  already columns on every template row, so a "$" or "DocGate" pill is just
  reading data that's already there — nobody's built the badge, but there's
  no new tracking needed, unlike the two above.

**One gap specific to Console:** `listTemplatesAction` (what the model
actually calls, `console-actions.ts`) returns bare `{id, name}` today — even
the "already proven" fields above (page count, field count, created date)
would need that query widened to match the dashboard's before a Console
card could show real numbers instead of placeholders.

**What actually shipped:** a new, separate `GET /api/console/templates`
route (deliberately not a widening of `listTemplatesAction`, which stays
scoped to the model's own name-resolution tool call) returns name, page
count, field count, and computed party count for every card in the new
Templates tab. Created date is returned by the route but not currently
shown on the card (kept compact for the 240px sidebar) — trivial to add
later if wanted. Usage tracking and thumbnails were NOT built — still
exactly the "genuinely new work" described above, untouched by this pass.

## Explicitly out of scope

- Editing a template's payment/DocGate settings from this list view — same
  as today, that stays a dashboard-only capability.
- Deleting/renaming templates from Console — read/open only for this pass.
- Search/filter on the template list — org template counts are small enough
  today that a flat list is fine; revisit if that stops being true.

## Effort

The conversation-resume fix (the `?c=` param plumbing) is small — a few
files, no new UI. The list itself is small (Option A) to medium (Option B)
depending on which shape gets picked; the sidebar tab placement is small
either way.

## Open questions

1. **Option A vs Option B** for what clicking a template actually does —
   the central undecided piece of this doc.
2. Where the list lives (sidebar tab, inline-in-chat, or both) — leaning
   both, not confirmed.
3. If Option A is picked, whether to add a lightweight "discard this draft"
   affordance so browsing a template doesn't quietly accumulate rows in
   Documents over time.
4. Whether the card ships with just the proven fields (name/pages/fields/
   created) plus party count, or waits to also include usage tracking and a
   thumbnail — those two are real, separate pieces of new infrastructure,
   not part of what a same-day build would include.
