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
steps.** No new tables. Confirmed 2026-08-24: model this the way DocuSign
does — each recipient gets a visible **routing number** (1, 2, 2, 3, ...)
rather than an abstract "step" concept; the number IS `order_index`, so
this is a direct UI on the existing column, no translation layer. Same
number = parallel/same tier (a later number only unlocks once *every*
recipient sharing every lower number has completed — e.g. with 1, 2, 2, 3,
recipient 3 waits for both recipients tagged 2). Compose UI needs a way
to assign/edit each recipient's number (reorder or renumber, not just a
flat add-in-order list) and, before sending, a read-only **Signing Order
Diagram** — a preview view the sender opens (DocuSign's pattern: a "View"
link next to the signing-order control) that visualizes the routing
sequence/parallel groups so they can confirm it's right before committing.

**Layer 2 — recipient role.** New column, e.g. `signers.recipient_role
text not null default 'signer' check (in ('signer', 'viewer'))`, plus
optionally a free-text `role_label` for the "Finance"-style tag (display
only, no logic). `viewer` rows: skip the sign page's field-filling UI
entirely (read-only view), never block `computeSigningOutcome`'s
completion check, and get their own reminder/email copy ("shared with
you for review" rather than "please sign"). `signer` stays today's
behavior, unchanged.

## Decisions — Michael, 2026-08-24

1. **Build the full routing-number model, not a smaller reorder-only
   pass.** Confirmed DocuSign-style: same number = parallel, a later
   number waits for every recipient sharing every lower number. Also
   wants the pre-send Signing Order Diagram preview (see Layer 1 above)
   — not just an editable list, but a way to visually confirm the routing
   before sending.
2. **View-only role — likely yes, not yet locked.** Michael's read is
   that a viewer was the actual pain point behind this feedback (more
   than the "finance" label). He's going to double-check with the source
   before this is final — treat as probable, not confirmed. Don't start
   building the viewer-role behavior change until he confirms.
3. **Fixed enum for role, confirmed** — `signer`/`viewer`. Explicitly
   wants this shaped so a freeform display label (the "Finance"-style
   tag) can be added later without rework — don't box that out, but no
   need to build the label itself now.
4. **Lock order once a document is sent, confirmed.** No reordering or
   renumbering after tier-1 notifications have gone out.
5. **Ungated, confirmed.** Free on every plan, matching the
   `frequent_signers`/per-recipient-auth precedent.
6. **Saved recipient groups should carry sticky order/role defaults,
   confirmed** — applies once/if `saved-recipient-groups-scope.md`
   actually gets built, not before.

## Status

Scoped, with decisions above locked in on 2026-08-24 (except #2, still
pending Michael's confirmation). Still not approved to build — answering
these questions isn't a go-ahead, per `feedback-scope-means-scope-only.md`.
No code changes in this pass.
