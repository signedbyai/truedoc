-- Lead capture for EuroLTV (the long-term-validity / re-timestamping
-- service scoped in EUROLTV_SCOPE.md as EuroTSA's Phase 2). euroltv.eu is
-- planned as a standalone static site on its own VM, same pattern as
-- eurotsa.eu -- this table just gives its waitlist form somewhere to
-- write to, via the /api/euroltv-waitlist route below. Mirrors
-- eurotsa_waitlist exactly: a waitlist, not an account system -- a single
-- email column is the whole point, no API keys, no confirmation email.
--
-- Same pattern as eurotsa_waitlist/disposable_email_blocks/plan_cap_hits:
-- RLS on, no policies, service-role only (the API route uses the admin
-- client).
create table if not exists public.euroltv_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Best-effort context on where the signup came from (e.g. a specific
  -- landing page vs. a footer link) -- not exposed to the submitter,
  -- purely for understanding which conversion point works. Free text, not
  -- an enum, for the same reason as eurotsa_waitlist.source: the calling
  -- page is outside this repo, so there's no enforcement mechanism on
  -- what it sends.
  source text,
  ip text,
  created_at timestamptz not null default now()
);

alter table public.euroltv_waitlist enable row level security;

create index if not exists euroltv_waitlist_created_at_idx on public.euroltv_waitlist (created_at);
create unique index if not exists euroltv_waitlist_email_idx on public.euroltv_waitlist (lower(email));
