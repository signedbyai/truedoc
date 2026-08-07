# Signer export (unique signers) — scope

Scope only, not built (2026-08-07, direct ask, split out from the combined
[[signer-export-and-document-zip-scope]] doc into its own file at the same
session, alongside [[auto-frequent-signers-scope]] — the two are related
but different enough to deserve separate docs rather than sections of one).
Grounded in the actual current code, not assumption.

## Why this now

Settings has no way to get a sender's own signer/counterparty list out of
the product at all today — the closest-looking thing, "Frequent signers,"
is a different feature entirely (see below), and there's no export of any
kind for the actual full history.

## Current state (checked directly, not assumed)

- **This is not `frequent_signers`.** Settings already has a "Frequent
  signers" card, but that table (`0032_frequent_signers.sql`) is a small,
  manually-curated address book — seeded with just the signed-in user's
  own entry, grown only when a sender explicitly adds a contact via the
  AI Drafter/Magic Quote picker. It's nowhere close to "every signer
  who's ever been sent a document." Worth being precise about this before
  building, since the two look similar from the Settings page but pull
  from completely different tables serving completely different purposes.
- **The real data lives in `signers`** — every row ever created across
  every one of the org's documents (`email`, `name`, `status`,
  `signed_at`, `document_id`), joinable to `documents` for title/context.
  No existing route reads this in aggregate across an org today; every
  current use of `signers` is scoped to one document at a time.

## Design: unique signers (deduped), not full per-document history

**Confirmed 2026-08-07: this export is one row per unique person, not one
row per document appearance.** The same email can appear on many of an
org's documents; the export collapses those into a single row per
distinct email, not a full audit-trail-style history with repeats. This
resolves what was previously an open question in the combined scope doc —
a full-history variant (one row per document, repeats included) is a
different, smaller follow-on if ever wanted, not this doc's design.

**Name conflict rule, needed since dedup can hit different names for the
same email** (e.g. "Bob" on one document, "Robert Smith" on another):
most-recent signed document's name wins, matching the general "most
recent data is the most likely to be current" default this codebase
already leans on elsewhere (e.g. `organizations.last_badge_*` in the
badge-placement scope). Not the only reasonable choice — most-frequent
spelling is a real alternative — but most-recent is simpler to compute in
the same query (`distinct on (email) ... order by email, signed_at desc`)
without a second aggregation pass.

## Build

New route (e.g. `GET /api/org/signers-export`): `select distinct on
(email) email, name, signed_at from signers where document_id in (select
id from documents where org_id = ...) order by email, signed_at desc`,
formatted as CSV with a `Content-Disposition: attachment` header. No new
infrastructure — same shape as other read-and-format routes already in
the codebase. A new row in Settings, clearly labeled and visually
distinct from "Frequent signers" (e.g. "Export signer contacts") so the
two aren't confused.

## Open decisions

1. **Who can access it?** A bulk PII export of every counterparty an org
   has ever dealt with is a more sensitive action than viewing one
   signer's info on one document. Worth deciding whether every org member
   can pull this, or just Owner/Admin roles (same tier as the existing
   role-management gate) — this wasn't decided in the earlier combined
   draft either and still needs an answer.
2. **Scope of "signer"** — include every status (`pending`, `sent`,
   `viewed`, `signed`, `declined`), or only people who actually completed
   a signature? A pending/declined signer is still a real contact the
   org dealt with, so defaulting to "every status" seems right, but worth
   confirming rather than assuming, especially since
   [[auto-frequent-signers-scope]] (the frequency-ranked sibling of this
   doc) deliberately counts *signed* only — these two could reasonably
   use different scopes for different reasons, not an inconsistency to
   silently resolve the same way.
3. **Data-retention nuance, not a blocker:** the org already owns this
   data as controller for their own signers (SignedBy is processor — the
   same dual controller/processor framing already established for the
   product generally). Exporting it to the org isn't a new disclosure.
   Worth a light note, though: once it's a CSV on someone's laptop, that
   copy sits outside SignedBy's own deletion/retention controls — not a
   reason not to build this (any export feature has this property), just
   worth naming rather than ignoring.

## Effort (rough)

Small — one new read/format route, one dedup query, no new
infrastructure. Comparable to other CSV-export items already in the
backlog ([[magic-quote-reporting-scope]]).

## Status

Scoped only, not built, per [[feedback-scope-means-scope-only]].
