-- Lightweight per-page view-time tracking, for the sender-facing
-- "Engagement" summary on a signer row (src/components/signer-row.tsx,
-- wired in via dashboard/documents/[id]/page.tsx). Gated to Starter+
-- (plan.ts's pageViewTracking feature) -- same tier as AI drafting and
-- templates.
--
-- Deliberately scoped narrower than a full DocSend-style data room: just
-- "how long did this signer spend on each page," derived from the signing-
-- view client (src/components/signing-view.tsx) reporting accumulated
-- dwell-time deltas roughly every 10s, on tab-hide, and on unload/navigate
-- away. No separate "view count"/session tracking -- audit_events already
-- captures the "viewed" event with a timestamp (see the audit-trail
-- design), so this table's only job is the page-level breakdown
-- audit_events doesn't have.
--
-- One row per (document, signer, page), upserted via the increment_page_view
-- function below so concurrent/rapid flushes from the same signer can't
-- race and clobber each other's deltas.
create table if not exists document_page_views (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  signer_id uuid not null references signers (id) on delete cascade,
  page integer not null,
  seconds_viewed integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, signer_id, page)
);

create index if not exists document_page_views_document_id_idx on document_page_views (document_id);

alter table document_page_views enable row level security;

-- Org members can read engagement data for documents in their own org --
-- same "scoped via parent document's org" join pattern as signers/
-- document_fields/audit_events in 0001_init.sql.
create policy "org members can view page views" on document_page_views
  for select using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = document_page_views.document_id and m.user_id = auth.uid()
    )
  );

-- Written only via the service-role admin client from the token-authenticated
-- POST /api/sign/[token]/view route (same access-control model as every
-- other signer-facing write -- "do you know the token," see
-- src/lib/signing.ts) -- so no insert/update policy is needed here, only
-- the select policy above for the sender-facing dashboard.

-- Atomic upsert-with-increment, same pattern as increment_rate_limit in
-- 0006_rate_limits.sql -- avoids a select-then-write race if a signer's
-- browser somehow flushes twice in close succession (e.g. a periodic flush
-- overlapping a tab-hide flush).
create or replace function public.increment_page_view(
  p_document_id uuid,
  p_signer_id uuid,
  p_page integer,
  p_seconds integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into document_page_views (document_id, signer_id, page, seconds_viewed, last_viewed_at)
  values (p_document_id, p_signer_id, p_page, p_seconds, now())
  on conflict (document_id, signer_id, page)
  do update set
    seconds_viewed = document_page_views.seconds_viewed + excluded.seconds_viewed,
    last_viewed_at = excluded.last_viewed_at;
$$;
