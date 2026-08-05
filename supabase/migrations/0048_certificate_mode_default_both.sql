-- Flips the "Certificate style" default from 'ask' to 'both' (2026-08-05,
-- direct ask: "let's assume both for now and skip the question so people
-- can get to the sealed file faster"). The app-level fallback in
-- console/app/page.tsx (`?? "both"`) alone did NOT do this — migration
-- 0042 gave the column `not null default 'ask'`, so every existing org row
-- already stores the literal string 'ask', never null/undefined. The app's
-- JS fallback can only ever kick in on a query hiccup; it was never going
-- to change what any real org actually sees. This migration is the real
-- fix: it changes the column's own default for new orgs, and backfills
-- every existing org still sitting on that default (i.e. still 'ask' —
-- no one has any real way to have "intentionally chosen" ask over both
-- yet, since both wasn't the alternative being offered when they signed
-- up) over to 'both'.
--
-- Still fully reversible per-org, self-serve, no code change needed — the
-- Settings dropdown (verified-badge-settings.tsx) keeps "Ask me every
-- time" as a real option; anyone who picks it back gets a real, explicit
-- 'ask' row again, distinct from this one-time backfill.

alter table organizations
  alter column verified_badge_certificate_mode set default 'both';

update organizations
  set verified_badge_certificate_mode = 'both'
  where verified_badge_certificate_mode = 'ask';
