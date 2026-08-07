# Auto frequent signers (top 10 by signed frequency) — scope

Scope only, not built (2026-08-07, direct ask, split out from the combined
[[signer-export-and-document-zip-scope]] doc, sibling to
[[signer-export-scope]] — same underlying `signers` table, different shape
of query and a meaningfully different design problem, so kept separate).
Grounded in the actual current code, not assumption.

## Why this now

`frequent_signers` (`0032_frequent_signers.sql`) is manual-only today — a
sender has to deliberately add every contact by hand. Its own migration
comment already flags an unbuilt "Phase 2" for reducing that friction, via
name-matching during document scanning. A frequency-ranked list sourced
from actual signing history is a cleaner way to solve the same underlying
problem (surface the right contacts without retyping them) without a
matching/classification step at all.

## Current state (checked directly, not assumed)

- `frequent_signers` has no concept of "automatically populated" today —
  every row was either the one self-seeded entry (`is_self`) or something
  a sender explicitly typed into the AI Drafter/Magic Quote contact
  picker. No column distinguishes how a row got there.
- The `signers` table has no aggregate/ranking query run against it
  anywhere in the codebase currently — every existing read is scoped to
  one document's signers, never an org-wide rollup.

## Design: top 10 by *signed* frequency, not just "appeared as a signer"

**Confirmed 2026-08-07: ranked by actual completions (`status = 'signed'`),
not by invite count.** Being invited to sign three documents and never
completing any of them is a materially weaker signal than three genuine
completions — "frequency" here specifically means how often someone has
finished signing, matching the doc's own name ("sorted signed frequency").
This is a deliberate, narrower scope than [[signer-export-scope]]'s own
open question about which statuses to include — the two docs can
reasonably answer that question differently, not an inconsistency to
force into agreement.

**Mechanics:** `select email, name, count(*) as signed_count from signers
where document_id in (select id from documents where org_id = ...) and
status = 'signed' group by email, name order by signed_count desc limit
10` — per org, most-recent name per email if the same person signed under
slightly different name spellings (same tiebreak reasoning as
[[signer-export-scope]]).

## The real design question: rank-based cutoffs don't behave like the
earlier threshold idea

The original conversation's first version of this idea was a fixed
absolute threshold ("3+ sends" — monotonic, once you cross it you stay
in). **A top-10 rank is fundamentally different: list membership can
shrink or reshuffle, not just grow.** Someone sitting at #10 today can get
displaced by a new signer's 4th completion tomorrow. This needs explicit
decisions, not silent assumption:

1. **Live-computed vs. persisted — recommended: live-computed, no schema
   change at all.** Because the list is inherently re-rankable, storing
   auto-derived rows in `frequent_signers` (and then having to reconcile
   insert/remove as ranks shift) is real, avoidable complexity. Simpler
   alternative: compute the top-10 query fresh whenever Settings renders
   the Frequent Signers card, and merge it with the actual `frequent_signers`
   manual rows at render time only — nothing written back to the table,
   nothing to keep in sync, no backfill script needed either since it's
   always computed from current history. Tradeoff: one extra aggregate
   query per page render, which is unlikely to matter at a single org's
   scale but is the one real cost of this approach versus persisting.
2. **Manual entries always win, never get displaced by rank.** A contact
   a sender deliberately added should never disappear because someone
   else's signing frequency overtook them — the top-10 computation should
   only ever fill in *additional* rows alongside existing manual/self
   entries, skipping any email already manually present, not compete with
   them for the 10 slots.
3. **Tie-breaking at the boundary.** Two people tied on `signed_count` at
   the cutoff need a deterministic secondary sort (e.g. most recent
   `signed_at` first) so the exact top-10 set doesn't depend on
   arbitrary row order.
4. **Labeling in the UI.** Auto-surfaced contacts should read differently
   from manually-added ones (e.g. a small "frequent signer" tag vs. no
   tag) so a sender understands why a name they never typed in is
   showing up, and understands it could change over time — unlike a
   manual entry, which won't.

**If persisting is ever preferred instead** (e.g. to avoid the repeated
aggregate query, or to let a sender "pin" an auto-suggested contact into
a permanent manual one) — a `source` column (`"manual"` / `"auto"` /
`"self"`) on `frequent_signers` plus a recompute-on-completion trigger is
the fallback design, but it inherits the harder problem of *removing* a
row when someone falls out of rank, which the live-computed approach
above avoids by construction. Not recommended as the first cut.

## Effort (rough)

Small — one new aggregate query (shareable with
[[signer-export-scope]]'s general "roll up `signers` by org" shape), a
small merge step in whatever renders the Frequent Signers list, no schema
change under the recommended live-computed design. Meaningfully larger
only if the persisted/`source`-column fallback is chosen instead.

## Status

Scoped only, not built, per [[feedback-scope-means-scope-only]].
