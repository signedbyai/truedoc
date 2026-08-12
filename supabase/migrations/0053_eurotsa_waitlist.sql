-- Lead capture for the EuroTSA -> Tallgrass qualified-timestamp funnel
-- (EUROTSA_SCOPE.md's "Growth funnel" section). eurotsa.eu is a standalone
-- static site on its own VM, not part of this Next.js app -- this table
-- just gives its waitlist form somewhere to write to, via the
-- /api/eurotsa-waitlist route below. Deliberately NOT an accounts/API-key
-- system per the scope doc's explicit "Lead capture via a waitlist, not an
-- account system" decision -- a single email column is the whole point.
--
-- Same pattern as disposable_email_blocks/plan_cap_hits: RLS on, no
-- policies, service-role only (the API route uses the admin client).
create table if not exists public.eurotsa_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Best-effort context on WHERE the signup came from (the 429 rate-limit
  -- response vs. the footer link) -- not exposed to the submitter, purely
  -- for understanding which conversion point actually works. Free text,
  -- not an enum -- the calling page passes a short fixed string, but
  -- there's no enforcement mechanism on a request from a static HTML page
  -- outside this repo, so a check constraint would just be a foot-gun.
  source text,
  ip text,
  created_at timestamptz not null default now()
);

alter table public.eurotsa_waitlist enable row level security;

create index if not exists eurotsa_waitlist_created_at_idx on public.eurotsa_waitlist (created_at);
create unique index if not exists eurotsa_waitlist_email_idx on public.eurotsa_waitlist (lower(email));
