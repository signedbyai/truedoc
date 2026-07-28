# Magic Quote reporting — scope

Status: **scoping, not built**. Covers on-demand bulk download of completed Magic
Quote PDFs, an optional summary report bundled into that download, an optional
date-range filter, and quote-identifying filenames with a sequence number.

## Michael's ask, verbatim requirements

1. A Magic Quote user can download all of their **completed** (fully signed)
   quotes at any time.
2. A summary report can optionally be included in that download: count of
   completed quotes, total amount quoted, total including tax, total excluding
   tax.
3. A date range can optionally be specified for the download.
4. Downloaded PDF filenames must make it obvious it's a Magic Quote, plus a
   sequence number.
5. Gaps in the sequence (from quotes that were never completed) are expected
   and fine — no requirement to backfill or renumber.

## What exists today, and why none of this works yet

Read `api/quotes/finalize/route.ts`, `supabase/migrations/0001_init.sql`, and
`lib/quote-types.ts` in full, and grepped the whole `src/` tree for zip-related
packages. Four real gaps, none of them small:

**1. Nothing marks a document as a Magic Quote in a queryable way.** Finalizing
a quote inserts an entirely ordinary row into `documents` — same table, same
columns, as an uploaded contract or an AI-drafted document. The only trace of
its Magic Quote origin is a JSON blob on an `audit_events` row:
`{ event_type: "created", metadata: { ai_quote: true, total, currency,
created_at } }`. That's not indexed, not a real column, and not something you
can efficiently filter `documents` on at scale — every "get this org's Magic
Quotes" query would mean scanning `audit_events` metadata first, then joining
back to `documents`. Needs a real flag.

**2. The tax/subtotal breakdown is computed and then thrown away.**
`computeQuoteTotals()` (`lib/quote-types.ts`) returns `{ subtotal, taxAmount,
taxRatePercent, total }` at finalize time, but only `total` and `currency`
survive into the `audit_events` metadata blob. Requirement #2 needs "total
including tax" AND "total excluding tax" per quote — that's `total` and
`subtotal`, and `subtotal` isn't stored anywhere today. Every summary report
built on current data would have to either recompute from the PDF (fragile) or
just be wrong.

**3. No sequence number concept exists anywhere in the schema.** Not on
`documents`, not on any other table. Requirement #4 needs one, and the
"gaps are fine" caveat matters for how it's generated (see below).

**4. No bulk-export path exists at all.** Grepped for `zip|archiver|JSZip|
adm-zip` across `src/` and checked `package.json` — zero matches. Every
download today (`/api/documents/[id]/signed-file`,
`/api/sign/[token]/signed-file`) is one document at a time. A "download all
completed quotes" button needs a genuinely new capability: fetch N PDFs from
R2, bundle them, stream a zip back.

There's a fifth, smaller gap: `documents` has no `completed_at` column either
— the submit route just flips `status` to `'completed'` with no timestamp
column change. The only completion timestamp that exists is the `created_at`
on the matching `audit_events` row (`event_type: "completed"`), which works
but means the date-range filter (#3) has to join through `audit_events` rather
than filtering `documents` directly.

## Proposed schema (new migration)

Add to `documents` rather than a separate `quotes` table — a quote is still an
ordinary document in every other way (goes through the same field/signing
flow, same status lifecycle), so a few nullable columns is proportionate and
keeps every existing document query untouched:

- `is_magic_quote boolean not null default false` — set at finalize time,
  replaces the `audit_events.metadata.ai_quote` flag as the source of truth
  (indexed, so `where org_id = ... and is_magic_quote and status =
  'completed'` is a normal fast query instead of a metadata scan).
- `quote_subtotal numeric(12,2)`, `quote_tax_amount numeric(12,2)`,
  `quote_tax_rate_percent numeric(5,2)`, `quote_currency text` — persist the
  full `computeQuoteTotals()` breakdown at finalize time instead of just
  `total`+`currency`. (`total` doesn't need its own column — it's
  `quote_subtotal + quote_tax_amount`, and computing it in the report query
  avoids two numbers ever silently drifting apart.)
- `quote_sequence integer` — nullable, org-scoped, explained below.
- `completed_at timestamptz` — set alongside the existing `status = 
  'completed'` update in `submit/route.ts`. Small, generically useful beyond
  quotes (every "when did this finish" question elsewhere in the app currently
  has to join `audit_events`), and directly needed for the date-range filter.

## Sequence number: assign at completion, not at creation

The requirement explicitly says gaps from incomplete quotes are fine — that's
the tell for *when* to assign the number. Two options:

- **Assign at creation** (when the quote document is first finalized/sent).
  Gaps happen whenever a created quote never gets signed — matches "gaps are
  OK," but means the number a customer eventually sees on their PDF was
  decided before anyone signed anything, so two quotes sent the same day in a
  different completion order could show sequence numbers out of order in the
  completed-download batch.
- **Assign at completion** (when the document flips to `status = 'completed'`)
  — recommended. The sequence then reads, to the customer, like an actual
  "this was our Nth completed quote" counter, always in true completion order,
  and gaps still occur naturally (any quote that's sent but never signed just
  never consumes a number). This is the more standard meaning of an invoice/
  quote sequence number in practice, and it's simpler to reason about.

Either way, generate it with a Postgres sequence-per-org (or a `select
coalesce(max(quote_sequence),0)+1 ... for update` against the org's own quotes
under a row lock) rather than counting rows at read time, so two quotes
completing concurrently can't race onto the same number.

## Filename format for the download

`SignedBy-MagicQuote-{sequence}-{title-slug}.pdf`, e.g.
`SignedBy-MagicQuote-014-website-redesign.pdf` — sequence zero-padded (3
digits, matching the "obvious it's a quote, obvious the number" requirement)
ahead of the existing title-based slug already used for the plain signed-file
download today, so the change is additive to the current naming, not a
replacement.

## Bulk download + summary report — proposed shape

New endpoint, e.g. `GET /api/quotes/export?from=...&to=...&summary=1`:

1. Query `documents where org_id = ... and is_magic_quote and status =
   'completed'`, optionally bounded by `completed_at between from/to`.
2. For each, fetch the signed PDF bytes from R2 (same helper
   `getFromR2`/signed-file logic already used elsewhere, reused not
   duplicated) and add to a zip under the filename format above.
3. If `summary=1`: compute count, `sum(quote_subtotal)`, `sum(quote_tax_
   amount)`, `sum(quote_subtotal + quote_tax_amount)` server-side in the same
   query (cheap — these are now real indexed numeric columns, not something
   pulled from PDFs), render a one-page summary (reuse the existing PDF-
   generation stack already used for quotes/signed docs, `pdf-lib`) and add it
   to the zip as e.g. `_summary.pdf`, or as `summary.csv` alongside the PDFs —
   worth asking which format is more useful before building.
4. Stream the zip back. Needs an actual zip library — nothing in `package.json`
   does this today; the standard low-dependency choice is `archiver` (Node
   streams a zip without buffering the whole thing in memory, matters once an
   org has hundreds of completed quotes).
5. Entry point: a "Download all completed quotes" action somewhere in the
   dashboard — exact placement (documents list filter? a dedicated `/quotes`
   view?) not yet decided; Magic Quote documents aren't visually distinguished
   from other documents in the dashboard today either, which is a related gap
   worth closing at the same time (`is_magic_quote` badge/filter on the
   existing documents list).

## Explicitly out of scope for v1

- Mixed-currency orgs: if an org has completed quotes in more than one
  currency (the picker supports 4), a single summary total is meaningless —
  either the report needs to group by currency, or v1 restricts the export to
  one currency at a time. Needs a decision before building, not an
  afterthought.
- Any changes to the currently-unpersisted subtotal/tax breakdown for quotes
  finalized *before* this ships — those older completed quotes would have
  `quote_subtotal`/`quote_tax_amount` as `null` and either need excluding from
  the summary math or a one-off backfill script re-deriving them from stored
  line items if those still exist in the source data.
- Scheduled/recurring exports (e.g. "email me last month's completed quotes on
  the 1st") — the ask was on-demand only.

## Open questions

1. Assign the sequence number at quote **completion** (recommended above) or
   at **creation**?
2. Summary as a PDF page bundled in the zip, or a `.csv`/`.xlsx` alongside the
   PDFs? Recommend adding a plain CSV, since "the total sum amount" reads like
   something Michael's customers may want to drop straight into a spreadsheet,
   not just eyeball on a PDF page.
3. Mixed-currency handling for the summary totals — group by currency, or
   restrict the export to one currency per run?
4. Where does "Download all completed quotes" live in the dashboard, and
   should completed Magic Quotes get their own filtered view there regardless
   of this export feature?
