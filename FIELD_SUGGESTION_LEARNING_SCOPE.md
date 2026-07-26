# Field-suggestion correction logging — scope (Phase 1: data only)

Status: **scoping, not built**. This defines what we'd log if we start collecting
signal on AI field-suggestion accuracy. Nothing here changes suggestion behavior —
it's the data-collection groundwork that a future retrieval/heuristic improvement
(see the "self-learning" discussion, 2026-07-26) would need before it could exist.

## Goal / non-goal

Goal: know, in aggregate, how often and how much senders correct an AI-suggested
field's position, type, or party assignment — broken down by a coarse description
of the signature block's layout — so a later change (few-shot exemplar retrieval,
or a deterministic special case for a common layout) can be justified by real
numbers instead of one screenshot.

Non-goal (this phase): no change to `suggest-fields.ts`'s prompt or
`placeCandidates()` behavior, no retrieval-augmented prompting, no dashboard, no
per-org anything. Just capture the deltas so they exist to look at later.

## What already exists vs. what's missing

`Field.suggested` (`field-editor.tsx`) is explicitly client-only today — never sent
to the server, and `persist()` filters out any field still `suggested` before
saving (line ~1066). So right now there is zero record, anywhere, of what the AI
originally suggested once a sender accepts, moves, or deletes it. That's the whole
gap this phase closes.

## The three real hook points (confirmed in field-editor.tsx)

A suggested field's life cycle only ever ends one of three ways, and each already
has a single call site:

1. **Accepted, possibly moved** — `confirmField(id)` (~line 881). Fires on tap-in-
   place, drag-release, and the ✓ button alike — all three converge here, so it's
   the one place to diff final `(x, y, signerId)` against the original suggestion.
2. **Rejected outright** — `removeField(id)` (~line 1009), called while
   `f.suggested === true`. If a field was already confirmed before deletion, that's
   a different signal (or none) — only log this path when `suggested` is still
   true at the moment of removal.
3. **Party reassigned before/at confirmation** — the same click-to-assign-active-
   recipient flow used for manual fields (~line 850, `signerId: activeRecipientId`)
   also applies to a still-suggested field. The delta that matters here is: did the
   AI's `role` → the recipient that ended up bound to `signerId` at confirm time,
   or did the sender pick a different recipient than the one the AI's `role` would
   have implied.

Each suggested `Field` would need to carry its **original** suggested values
(`origX`, `origY`, `origRole`) alongside the live ones from the moment it's created
in the `newSuggested` map (~line 565), so the diff at confirm/delete time is exact
rather than reconstructed.

## Signature-block "shape descriptor" (geometry only, no text)

The point of this field is to let later analysis group "documents like this one"
without ever storing what the document said. It's derived entirely from
`PositionedTextItem` geometry (`pdf-text.ts`) and the AI's own party count — never
from `item.str`.

Proposed fields, all numeric or small enums:

- `party_count` — from `parties.length` for that document.
- `layout` — `"single_party" | "stacked_blocks" | "side_by_side_columns" | "unknown"`.
  Computed deterministically: cluster each party's signature-line y-position; if
  two or more parties' lines fall in the same y-band but at clearly separated
  x-ranges (a real gap between them, not just noise), that's
  `side_by_side_columns`; distinct, non-overlapping y-bands is `stacked_blocks`.
  This is exactly the geometric pattern behind the bug just fixed — worth having
  as a named category from day one since it's already the most likely thing to
  special-case later.
- `column_count` — 1 or 2 (rarely more) for `side_by_side_columns`, so a 3-up
  layout isn't silently bucketed with a 2-up one.
- `field_type` — signature/initials/date/text/checkbox, the type actually being
  logged.
- `page_fraction_x` / `page_fraction_y` — which rough zone of the page the
  suggestion landed in (e.g. quantized to a 0.1 grid), not the exact coordinate,
  so the row can't be used to reconstruct a specific document's exact layout even
  in combination with other rows.

## Correction delta fields

- `outcome` — `"kept" | "moved" | "deleted" | "role_changed"` (a row can be both
  `moved` and `role_changed`; store as two booleans plus keep `outcome` as the
  primary one for quick filtering — exact shape to finalize at migration time).
- `delta_x`, `delta_y` — signed, quantized (see below), only present for `moved`.
- `role_corrected` — boolean: did the sender bind this field to a different
  recipient than the one the AI's `role` pointed at.

## What is never stored (the anonymization guarantee)

- No document id, org id, signer id, or any other identifier that ties a row back
  to a specific customer, document, or person.
- No `item.str` / label text, ever — not even truncated or hashed. The whole point
  of `layout`/`party_count`/coordinates-only is that this table can't leak
  contract content even in aggregate.
- No name/title/company values from `parties` — those are exactly the free-text
  fields the user's own document supplies, and are out of scope entirely.
- Coordinates quantized (e.g. rounded to the nearest 0.02, ~2% of page size)
  rather than stored at full precision, so a row is a coarse signal, not a precise
  fingerprint of one document's exact geometry.

## Where it'd live

A new table (name TBD, e.g. `suggestion_feedback`), written via a small
fire-and-forget endpoint the same shape as the existing
`api/sign/[token]/client-error` route: client posts a small JSON body, server
validates with a zod schema, inserts, and swallows failures — never blocks
`persist()` or the sender's save flow. No auth-sensitive data in the payload means
this endpoint can be simpler than the signer-facing routes (no
`requireVerifiedSigner`-equivalent needed — it's sender-side, behind the existing
dashboard auth, and carries nothing to protect on top of that).

## Decisions (2026-07-26)

1. **Privacy/legal framing** — covered by the current privacy policy's existing
   product-improvement language. Michael is flagging this as an explicit item to
   run past privacy/legal once SignedBy passes 100 beta customers, rather than
   before this phase is built. Not a blocker for building the logging pipe now.
2. **Opt-out** — a per-org settings toggle: "Allow SignedBy to use anonymized field
   placement coordinates to improve the product." Lives in org settings alongside
   the other org-level toggles (branding, auth defaults, etc.); when off, the
   client simply never posts to the logging endpoint for that org. Default value
   (on vs. off) still to confirm at build time — likely on-by-default given the
   anonymized-by-design framing, but worth a final check against the privacy copy
   before shipping.
3. **Scope of what's logged — expanded, then narrowed**: log every field
   placement, categorized by `origin: "ai_suggested" | "sender_placed"`, not just
   corrections to AI suggestions. (Named this way rather than `"suggested" |
   "manual"` — "sender" matches the term the rest of the codebase already uses
   for the org-side user as opposed to "signer," and "ai_suggested" stays
   unambiguous if a second, non-AI suggestion source is ever added later, e.g.
   template defaults.) `origin: "sender_placed"` fields (placed via
   `placeField()`, ~line 833 — the click-a-tool-then-click-the-page flow,
   `signerId` starts as `activeRecipientId`, no `suggested` flag at all) have no
   delta to compute against — there was never an AI proposal — but they're the
   only way to see a **false negative**: a spot the AI should have suggested but
   didn't, which the ai_suggested correction data can't show by itself (it can
   only tell you the AI was imprecise about something it *did* propose).
   Aggregated by shape category, a high sender-placed-fields-per-document rate for
   `side_by_side_columns` vs. `stacked_blocks` is exactly the kind of signal that
   would justify special-casing a layout.

   **Narrowed**: only log `origin: "sender_placed"` when the document was
   actually analyzed — i.e. `suggestFields()` ran and returned real candidates,
   whether or not the sender used them — not when the document hit the
   `unreadable: true` fallback path. An unreadable document has no extractable
   text, so no shape descriptor can be computed for it (`layout` would just be
   `"unknown"` with zero context) and a sender-placed field there says nothing
   about suggestion quality — there was no real suggestion attempt to compare
   against, so it isn't a false negative, just noise for this specific goal.
   `persist()` already knows the `unreadable` flag for the current session, so
   this is a cheap guard: skip the log call entirely when it's true.

   This adds a **4th hook point** to the three already listed above: sender-placed
   fields (on analyzed documents only) get logged once at `persist()` time
   (final `x`, `y`, `type`, `layout` shape descriptor for the page they're on),
   the same as a `kept`/`moved` ai_suggested field's final state, just tagged
   `origin: "sender_placed"` with no `outcome`/delta fields populated.
4. **Retention** — recommend indefinite retention (or at minimum a 12–18 month
   rolling window), reassessed alongside the 100-customer legal check rather than
   set on a fixed short timer now. Reasoning: these rows carry no identifiers
   (no doc/org/signer id, no text), so the usual data-minimization pressure that
   applies to personal data doesn't really bind here — the real constraint is
   statistical, not compliance. At beta-stage volume, the rarer shape categories
   (e.g. `side_by_side_columns`) will take a while to accumulate enough rows to
   trust a pattern from — plausibly several months even at a healthy signup pace,
   since `MAX_SUGGESTIONS` caps each document at 20 fields and multi-party
   side-by-side layouts are a minority of documents to begin with. Deleting rows
   early risks losing exactly the early signal this exists to capture, with no
   corresponding privacy benefit since there's nothing identifying in them to
   begin with. Worth revisiting formally at the same 100-customer legal
   checkpoint, once real volume shows how fast each category is actually filling
   in.

## Explicitly out of scope for this phase

No prompt changes, no few-shot exemplar retrieval, no deterministic layout
special-casing, no dashboard/reporting UI. Those are the follow-on decisions this
data would inform — not something to build until there's enough logged volume to
show whether `side_by_side_columns` (or some other shape) is common enough to be
worth targeting specifically.
