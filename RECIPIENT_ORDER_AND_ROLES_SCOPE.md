# Recipient signing order + roles — scope

Scoped 2026-08-24 from a legal-vertical feedback call (ex-DocuSign user,
played back to Michael this session — see `lawyer-vertical-discovery.md`
item 4 in project memory). Their ask: multi-party documents (3-4 external/
internal recipients) need an explicit way to define who signs 1st/2nd/3rd/
4th, and some way to distinguish a plain signer from someone who should
only view the document, or sign specifically "as finance." They weren't
sure SignedBy has this at all. Scope only — not approved to build, per
`feedback-scope-means-scope-only.md`.

## Important finding before writing this — the backend already does most of this

`signers.order_index` (`supabase/migrations/0001_init.sql`, present since
day one) was designed for exactly this: the column comment reads
`sequential routing order; same value = parallel`. The send route
(`api/documents/[id]/send/route.ts`) only emails the lowest-`order_index`
tier at send time (`firstTier = signers[0].order_index`, filters
`toNotify` to that tier); the submit route's `computeSigningOutcome`
promotes the next tier once the current one finishes. Multi-party
sequential AND parallel-within-a-step routing genuinely works end to end
today, with no code changes needed on that path.

**What's actually missing is entirely on the compose side, in
`field-editor.tsx`.** Two real gaps, not one:

1. **No visibility or control over order at all.** `order_index` is
   silently derived from array position — `buildPendingRecipient` sets
   `order_index: recipients.length` (i.e. every new add gets the next
   integer), and `removeRecipient` re-indexes everyone afterward
   (`.map((r, i) => ({ ...r, order_index: i }))`). There's no drag-to-
   reorder, no up/down control, no "signer 1 / signer 2" labeling on the
   recipient chips, and nothing on the document detail page's Signers
   card shows order either. A sender has no way to see or change who's
   first.
2. **No way to create a parallel step.** Because every add gets a
   strictly-increasing `order_index`, two recipients can never land in
   the same tier from the UI — despite the schema explicitly supporting
   it. Today every document a sender builds is, in effect, fully
   sequential whether they intended that or not.

Neither gap needs new backend routing logic — this is a compose-UI and
(for role) a small-schema problem sitting on top of plumbing that already
works.

## The role ask is a separate, smaller thing wearing the same request

"Some people should just view it, others sign as finance" is really two
different asks bundled together:

- **View-only recipients** — a real behavior change. A viewer needs to
  receive a link, see the document, and NOT be required to sign for the
  document to complete. `computeSigningOutcome` and the completion check
  would need to treat a viewer row as non-blocking. This is the one piece
  here with actual new logic, not just UI.
- **A descriptive tag like "Finance"** — sounds like it's mostly about
  clarity in the recipient list and audit trail, not a distinct
  permission tier. Cheapest version: a plain free-text label next to a
  recipient's name/email, cosmetic only, no behavior tied to the string.

## Proposed shape (two additive layers, matching how other recipient
features here have been scoped)

**Layer 1 — make the existing order real, and let a sender build parallel
steps.** No new tables. Compose UI reorganizes the recipient chip row
around "steps" (each step = one `order_index` value, one or more
recipients per step) instead of a flat list — a numbered "Step 1 / Step 2"
grouping with a way to add a recipient to the current step vs. start a
new one, plus reordering steps (drag, or simple up/down). Only the order
column changes value; no schema change.

**Layer 2 — recipient role.** New column, e.g. `signers.recipient_role
text not null default 'signer' check (in ('signer', 'viewer'))`, plus
optionally a free-text `role_label` for the "Finance"-style tag (display
only, no logic). `viewer` rows: skip the sign page's field-filling UI
entirely (read-only view), never block `computeSigningOutcome`'s
completion check, and get their own reminder/email copy ("shared with
you for review" rather than "please sign"). `signer` stays today's
behavior, unchanged.

## Open questions (Michael's call, nothing here is decided)

1. Whether to redesign the compose recipient UI around explicit "steps"
   (the parallel-step problem needs this either way) or ship a smaller
   flat-list-plus-reorder first and treat parallel grouping as a later
   pass — bigger IA question, not just a component swap.
2. Whether view-only recipients are worth building now, or whether
   Layer 1 (visible/reorderable sequential order) alone answers most of
   what this feedback call actually asked for — the "finance" role
   framing came from one call, not a repeated ask yet.
3. Fixed role enum (`signer`/`viewer`, extensible later to e.g.
   `approver`) vs. a freeform per-recipient label — enum can drive real
   behavior (the viewer gate above); freeform is cheap but decorative
   only. Could ship both: enum for the two real behaviors, plus an
   optional freeform label on top for display.
4. Whether order (and step membership) should lock once a document is
   sent — reordering signers after tier-1 emails have already gone out
   seems like it should be blocked or at least warned on, not silently
   allowed from the draft-editing surface.
5. Plan-tier gating — `frequent_signers` and per-recipient auth both
   shipped ungated; worth deciding up front whether this follows that
   precedent or is a differentiator, rather than gating it as an
   afterthought.
6. Interaction with `saved-recipient-groups-scope.md` (project memory) —
   if saved recipient groups ship, would a saved group also carry sticky
   order/step and role defaults, or only names/emails? Same shape of
   question that doc already flagged for `auth_required` defaults.

## Status

Scoped only, not approved to build. No code changes in this pass.
