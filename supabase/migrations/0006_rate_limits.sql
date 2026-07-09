-- Rate limiting — DB-backed fixed-window counter. Deliberately not a new
-- external service (no Upstash/Redis account needed): this reuses the
-- Supabase Postgres already provisioned, which is plenty for MVP request
-- volumes. Only ever written to via the service-role admin client from
-- src/lib/rate-limit.ts, so no RLS policies are needed beyond enabling it.

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

alter table rate_limits enable row level security;
-- No policies: only the service-role key (which bypasses RLS) ever touches
-- this table, from server-side code.

create or replace function increment_rate_limit(p_key text, p_window_start timestamptz)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into new_count;

  -- Opportunistic cleanup of old windows so this table doesn't grow forever.
  -- Runs on a small fraction of calls rather than every call, to keep the
  -- common path fast.
  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '2 hours';
  end if;

  return new_count;
end;
$$;
