-- Powers the signer-facing "You signed this in 38 seconds, faster than 84%
-- of signers this month" stat + share card shown on the signing-complete
-- screen (src/components/signing-view.tsx, wired via
-- src/app/api/sign/[token]/submit/route.ts). See src/lib/speed-stat.ts for
-- the plausibility/sample-size gating applied to this function's raw output
-- before anything is shown to a signer.
--
-- Deliberately NOT gated by plan.ts (unlike document_page_views itself,
-- which is Starter+ only) -- this is a signer-facing growth/share mechanic,
-- not a sender-facing analytics upsell, and src/app/api/sign/[token]/
-- view/route.ts already established the principle that the sending org's
-- plan tier must never be visible to (or affect) the signer's own
-- experience. So: prefer the more accurate active-dwell-time signal
-- (sum of document_page_views.seconds_viewed) when it exists (Starter+
-- senders), but fall back to wall-clock elapsed time from the signer's
-- first "viewed" audit event to their "signed" timestamp when it doesn't
-- (Free-plan senders) -- both of those source tables are written
-- regardless of plan, so every signer gets a stat either way.

create index if not exists document_page_views_signer_id_idx on document_page_views (signer_id);
create index if not exists audit_events_signer_id_event_type_idx on audit_events (signer_id, event_type);
create index if not exists signers_signed_at_idx on signers (signed_at);

create or replace function public.get_signer_speed_stat(p_signer_id uuid)
returns table (active_seconds numeric, percentile numeric, sample_size integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signed_at timestamptz;
  v_active_seconds numeric;
  v_viewed_at timestamptz;
begin
  select signed_at into v_signed_at from signers where id = p_signer_id;
  if v_signed_at is null then
    return; -- not signed (yet) -- nothing to report
  end if;

  select coalesce(sum(seconds_viewed), 0) into v_active_seconds
  from document_page_views
  where signer_id = p_signer_id;

  if v_active_seconds is null or v_active_seconds = 0 then
    select ae.created_at into v_viewed_at
    from audit_events ae
    where ae.signer_id = p_signer_id and ae.event_type = 'viewed'
    order by ae.created_at asc
    limit 1;

    if v_viewed_at is not null then
      v_active_seconds := extract(epoch from (v_signed_at - v_viewed_at));
    end if;
  end if;

  if v_active_seconds is null or v_active_seconds <= 0 then
    return; -- couldn't derive a timing signal either way
  end if;

  -- Comparison pool: every other signer who completed this calendar month,
  -- computed with the same dwell-time-else-wall-clock logic above. A CTE
  -- rather than a second round trip so the whole thing stays one query.
  return query
  with pool as (
    select
      s.id,
      (select coalesce(sum(pv.seconds_viewed), 0) from document_page_views pv where pv.signer_id = s.id) as pv_seconds,
      (
        select ae.created_at from audit_events ae
        where ae.signer_id = s.id and ae.event_type = 'viewed'
        order by ae.created_at asc limit 1
      ) as viewed_at,
      s.signed_at
    from signers s
    where s.signed_at is not null
      and s.signed_at >= date_trunc('month', now())
      and s.id != p_signer_id
  ),
  pool_times as (
    select
      case
        when pv_seconds > 0 then pv_seconds
        when viewed_at is not null then extract(epoch from (signed_at - viewed_at))
        else null
      end as t
    from pool
  ),
  valid_pool as (
    select t from pool_times where t is not null and t > 0
  )
  select
    v_active_seconds,
    case
      when (select count(*) from valid_pool) = 0 then null
      else round(100.0 * (select count(*) from valid_pool where t > v_active_seconds) / (select count(*) from valid_pool))
    end,
    (select count(*)::int from valid_pool);
end;
$$;
