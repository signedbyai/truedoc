# Bulk-send trust — pre-send visibility + post-send verification — scope

Status: SCOPED 2026-08-02, not built. Direct ask, after the console/bulk-send
zero-fields bug fix earlier today: "the overall suitability of the console
for sending in bulk with confidence, maybe there is a better user flow we
have not considered yet." Two directions picked to scope first out of four
floated: pre-send visibility and post-send verification (not: "require one
manual send first," not left as fully open).

## Why this one

The zero-fields bug (see `field-assignment-bug-history` memory) wasn't
caught by anything in the product — it took a human manually testing a real
signing link to notice. That's the actual problem this doc is about: bulk
send is a single irreversible action (real emails, real documents, no undo)
gated by one confirm click on a plain sentence, with nothing checking
afterward that what went out was actually usable. The role-count guard added
today (`checkSingleSignerRoleCount`) closes one specific failure mode —
wrong number of parties — but does nothing for "fields misplaced," "wrong
recipient matched to wrong role," or any future bug shaped like today's.
"Confidence" has to come from the product showing its work, not from a
bigger pile of individual guards each catching one specific bug after the
fact.

## Current state, grounded in code

**Pre-send:** `console-chat.ts`'s `describeConfirmAction()` (~line 302) is
the entire pre-send summary for `bulk_send` — one sentence: `"This will
send the template to N recipients as separate documents (expires ..., auth
...). Confirm?"`. No recipient list, no template name spelled out beyond
what the model already said earlier in the conversation, no field count, no
indication of how many parties the template expects vs. how many recipients
were given. The dashboard's own, separate bulk-send button
(`bulk-send-button.tsx`) does slightly better already — it live-counts
parsed recipients as you paste ("3 recipients detected") — but still shows
no per-recipient or per-field detail before firing.

**Post-send:** `bulkSendAction`'s return shape (`console-actions.ts`
~250-314) is `{ sent: [...], skippedCapReached: [...],
skippedTimeoutReached: [...] }` — every one of those three arrays is about
*whether a send attempt happened*, not *whether the resulting document is
actually signable*. A document that inserts zero usable fields (today's bug,
or any future variant of it) shows up in `sent`, indistinguishable from a
correct one. Nothing calls `field-visibility.ts`'s `signersWithoutFields()`
— the exact function `field-editor.tsx`'s `handleSend` already uses to
block a *manual* send with an unfilled signer — anywhere in the bulk-send
path, console or dashboard.

## Direction 1 — pre-send visibility

Replace the one-sentence confirm with a structured summary, rendered as an
actual `ConsoleChatTurnResult` variant (same pattern as `sealed` — see
`TEMPLATE_BROWSE_SCOPE.md`'s note on why ad-hoc text isn't enough) rather
than folding more detail into the model's prose:

- Template name + how many fields it places + how many distinct parties it
  expects (from `field_map`'s role count — `checkSingleSignerRoleCount`
  already computes this exact number today, just to reject instead of to
  show).
- The actual recipient list (email + name if given), not just a count —
  scrollable/collapsed past some length rather than an unbounded wall of
  text for a 200-recipient batch.
- Anything that would cause a per-recipient skip stated up front if
  knowable before sending (a malformed email `parseRecipients` already
  catches; an MX-lookup domain warning `checkEmailDomainHasMx` already
  computes per-recipient today but only reports it *after* sending, per
  recipient, one at a time — surfacing known-bad domains before the confirm
  instead of after the send would catch more before it's irreversible).

This is additive to the existing confirm/cancel mechanism, not a
replacement — `CONFIRM_REQUIRED`/`m.confirm` stays the same shape, this is
about what renders alongside it.

## Direction 2 — post-send verification

After `bulkSendAction` (or `sendDocumentAction` for a single send) inserts
`document_fields` for a newly created document, before counting it as a
success, run it through `signersWithoutFields()` for that document's own
signer. Two sub-options, not mutually exclusive:

- **Block-and-report at send time** — if the just-inserted fields resolve
  to zero visible fields for the signer, don't count that recipient as
  sent; roll it into a new `skippedNoFields` array (same shape as the
  existing `skippedCapReached`/`skippedTimeoutReached`) and surface it in
  the same "sent X, Y skipped, here's why" reply pattern
  `runConsoleChatTurn` already uses for the other two skip reasons. This
  should be structurally redundant after today's fix (the role-count guard
  should mean it's never reachable) — but "redundant safety check" is
  exactly the point: it catches the *next* bug shaped like this one, not
  just this specific one.
- **After-the-fact audit** — a lightweight scheduled/on-demand check
  (`scripts/`-style, or a dashboard "Documents" list warning) that flags
  any `sent` document, regardless of how it was created, where
  `signersWithoutFields()` comes back non-empty. Broader net than the
  send-time check (catches documents created by paths this scope doesn't
  touch, or created before this fix ships), but after-the-fact rather than
  preventive.

Recommend building the block-and-report version first — it's the same shape
as two guards that already exist in this exact function, small addition,
and it's preventive rather than reactive. The audit version is worth
scoping separately if the send-time check doesn't feel sufficient once
real volume is flowing.

## Explicitly out of scope (raised, not chosen this round)

- **"Require one manual send first"** — floated as a third direction
  (a template can't be bulk-sent until it's been sent once through the full
  editor). Not picked for this scope. Worth revisiting if the two directions
  above don't feel sufficient once built — it's a bigger behavior change
  (adds friction to every template's first use) than either of these.
- Rate/volume changes, pricing, or anything about the console spend cap —
  unrelated axis, already covered by existing metering.

## Effort

Direction 1 (pre-send visibility) is small-to-medium: mostly a new
`ConsoleChatTurnResult` variant + rendering, reusing data
(`checkSingleSignerRoleCount`, `parseRecipients`, `checkEmailDomainHasMx`)
that's already computed elsewhere in the same request. Direction 2's
block-and-report option is small — `signersWithoutFields()` already exists
and is unit-tested; this is one more call site plus threading a new skip
array through the same reporting path the other two already use.

## Open questions

1. Exact rendering for the pre-send recipient list on a large batch (100+
   recipients) — full scroll, truncate-with-count, or something else.
2. Whether MX-warning-before-send changes the confirm flow's shape (does a
   domain warning block confirming, or just annotate the list and let the
   user decide) — not decided.
3. Whether the post-send audit option is worth building now or only if the
   send-time check turns out insufficient — leaning "wait and see," not
   decided.
