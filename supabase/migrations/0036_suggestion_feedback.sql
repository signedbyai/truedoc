-- Field-suggestion correction logging, Phase 1 -- see
-- FIELD_SUGGESTION_LEARNING_SCOPE.md. Aggregate signal on how often and how
-- much senders correct an AI field suggestion (or place one manually where
-- the AI suggested nothing), grouped by a coarse geometric shape descriptor
-- of the signature block -- never anything from the document itself.
--
-- Built on legitimate-interest grounds (2026-07-27, direct instruction): this
-- is anonymized-by-design product-improvement telemetry, not personal data
-- about a signer or sender, so it isn't gated behind the same explicit-
-- consent bar as e.g. per-recipient auth. Flagged for a formal privacy/legal
-- review at the 100-beta-customer checkpoint (same gate already planned for
-- the rest of this feature, see the scope doc's Decisions section) --
-- specifically to determine whether anything about a wider beta rollout
-- would trigger the need for a real opt-out control, before expanding
-- beyond the current beta trial.
--
-- No document id, org id, signer id, or any other identifier that ties a row
-- back to a specific customer, document, or person -- by design, not by
-- policy: the columns to hold one don't exist on this table at all. RLS is
-- on with no policies (same pattern as public.feedback): the
-- /api/suggestion-feedback route writes with the admin client, nothing ever
-- reads this from the browser.
create table if not exists public.suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  origin text not null check (origin in ('ai_suggested', 'sender_placed')),
  field_type text not null check (field_type in ('signature', 'initials', 'date', 'text', 'checkbox')),

  -- Signature-block "shape descriptor" -- geometry only, computed from field
  -- coordinates, never from document text. See the scope doc for exactly
  -- how `layout`/`column_count` are derived.
  layout text not null check (layout in ('single_party', 'stacked_blocks', 'side_by_side_columns', 'unknown')),
  party_count smallint not null check (party_count >= 0),
  column_count smallint check (column_count is null or column_count >= 1),
  -- Quantized to a coarse 0.1 grid (see lib/suggestion-shape.ts's quantize())
  -- so a row can't be used to reconstruct a document's exact layout.
  page_fraction_x numeric(3,2) not null check (page_fraction_x >= 0 and page_fraction_x <= 1),
  page_fraction_y numeric(3,2) not null check (page_fraction_y >= 0 and page_fraction_y <= 1),

  -- Correction signal -- only ever populated for origin = 'ai_suggested'.
  -- Null/false for 'sender_placed' rows, which have no AI proposal to diff
  -- against (their value is in being a false-negative signal on their own).
  outcome text check (outcome is null or outcome in ('kept', 'moved', 'deleted', 'role_changed')),
  moved boolean not null default false,
  role_corrected boolean not null default false,
  -- Signed, quantized to the nearest 0.02 (~2% of page size); only present
  -- when moved = true.
  delta_x numeric(4,2),
  delta_y numeric(4,2)
);

alter table public.suggestion_feedback enable row level security;

create index if not exists suggestion_feedback_layout_idx on public.suggestion_feedback (layout);
create index if not exists suggestion_feedback_origin_idx on public.suggestion_feedback (origin);

-- Per-org opt-out, built "dark" (2026-07-27, direct instruction): the column
-- and its server-side enforcement (see /api/suggestion-feedback/route.ts)
-- ship now, but there is deliberately no UI control anywhere yet -- same
-- shape as ai_test_org (0028_ai_test_org.sql), toggled only via direct SQL
-- until/unless a real settings toggle is built later. Off (not opted out)
-- by default for every org, matching the legitimate-interest framing above.
alter table public.organizations add column if not exists suggestion_feedback_opt_out boolean not null default false;
