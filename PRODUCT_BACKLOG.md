# Product backlog

Small, self-contained items parked mid-scoping or mid-build — picked back
up later, not forgotten. Each entry has enough detail that a future session
doesn't need to re-derive the design from scratch.

## verify.signedby.ai subdomain for /verify — PARKED 2026-08-13

**Ask:** give the public document-verification page its own subdomain
(`verify.signedby.ai`) instead of living at `signedby.ai/verify`, so it
reads more like a distinct, official verification system than a page on
the marketing site.

**Status:** discussed, not started. Direct ask 2026-08-13: "let's leave
it for now maybe add verify subdomain to the backlog." Came up alongside
a broader "how do we make /verify look more official / more independent"
question — see that discussion for the fuller reasoning; two cheaper,
higher-leverage ideas were raised in the same conversation and are
probably worth doing before or alongside this:
1. A short "how this works" explainer on the page itself (checksum
   comparison against the record made at sealing, timestamped by an
   independent RFC 3161 authority) — real verification tools earn trust
   by showing their method, not just a green checkmark. Cheap, no infra
   change.
2. Publishing exact self-verification steps (the openssl commands to
   independently check an RFC 3161 token without trusting SignedBy's own
   page at all) — the only genuinely third-party-checkable form of
   "independent," as opposed to a styling/domain choice. More work than
   #1, more durable than the subdomain alone.

An EuroTSA outbound link from this same page was tried and reverted the
same day (see [[verify-page-eurotsa-link]] if that memory exists, or
`git log -- src/app/verify/page.tsx` — commits `ba40424` then `9b3c156`)
for the same underlying reason: realistic click-through audience is
narrow (someone doing real diligence on one specific document), so
changes here should stay low-cost/low-risk until there's a concrete
reason to invest further.

**Concrete gotcha already identified, must be handled:** every
already-sealed document has its checksum, QR code, and Certificate of
Completion page pointing at `signedby.ai/verify?hash=...` (and the
`?from=console` / `?from=dashboard&doc=...` variants — see that page's
own top comment). A subdomain move has to be **additive**, not a swap —
either serve the same page at both hosts (Next.js can route on the
`host` header via middleware, or add `verify.signedby.ai` as a second
domain on the same Vercel project pointing at the same route), or add a
redirect from the old path that preserves every query param. Whichever
approach: `signedby.ai/verify?hash=...` must keep resolving forever,
since those links are already baked into PDFs already sent to real
recipients and can't be recalled or edited.

**Sketch of what's left to build:** not scoped in detail yet — this was
parked at the "should we do this" stage, not the "how exactly" stage.
Whoever picks this up next should re-confirm which of the two routing
approaches above (dual-host same route vs. redirect) before starting,
since it changes whether old links keep their exact URL or get bounced.

## Repeat-visit pill on /verified-badge-invoices — PARKED 2026-08-09

**Ask:** if someone revisits any of the `/verified-badge-invoices` pages
(the main page + its `/guide` sub-page) twice or more, swap the hero pill
copy to a more direct nudge: "Your invoice is still unprotected. Claim
your verified badge for free and secure your invoices now." — overriding
whatever the pill/CTA A/B test variant (A/B/C, see
`marketing/verified-badge-invoice-cta-test.md`) would otherwise show. The
CTA button and bottom-section heading stay tied to the A/B variant either
way; only the pill text is called out as unconditional.

**Status:** design settled via a direct question to Michael, nothing built
yet. Parked "for a few days" 2026-08-09, direct ask — not rejected, just
not now.

**Detection method (decided):** cookieless server-side counter, not
localStorage. Chosen despite localStorage being cheaper/simpler (no DB,
no migration, already used elsewhere in the app for signer autosave)
because it wanted to persist across browser-data clears / not be
per-browser-only. Accepted tradeoffs, same posture as every flag in
`src/flags.ts`: identity is a hash of IP + User-Agent (shared IPs —
offices, VPNs, mobile carriers — can cause false "repeat visit"
positives; a visitor's identity can shift if their IP changes).

**Concrete gotcha already identified, must be handled:** Next.js
prefetches `<Link>` targets in the background whenever they scroll into
view, completely independent of a real visit — this is exactly what
caused an earlier false-alarm investigation (a mystery `/login` hit that
turned out to be a prefetch, not a real visitor). A naive "increment on
every page render" would inflate counts from people who never actually
looked at the page. Next.js marks these requests with a
`next-router-prefetch` header — check `(await headers()).get("next-router-prefetch")`
in the Server Component and skip the DB write entirely (read AND write)
when present.

**Sketch of what's left to build:**

1. Migration `0052_page_repeat_visits.sql` (next free number as of
   2026-08-09 — check `supabase/migrations/` for the actual next number
   when this is picked up):
   ```sql
   create table if not exists page_repeat_visits (
     visitor_key_hash text not null,
     path_group text not null,
     visit_count integer not null default 1,
     first_seen_at timestamptz not null default now(),
     last_seen_at timestamptz not null default now(),
     primary key (visitor_key_hash, path_group)
   );
   ```
   `path_group` (not the exact URL) so `/verified-badge-invoices` and
   `/verified-badge-invoices/guide` share one counter, and so this table
   can be reused for other verticals later (e.g.
   `verified-badge-real-estate`) without a schema change.

2. `src/lib/repeat-visit.ts` — new helper, `recordVisitAndGetIsRepeat(pathGroup: string): Promise<boolean>`:
   - Reads `headers()`, bails out (no DB touch, returns `false`) if
     `next-router-prefetch` is set.
   - Derives `visitorKeyHash` the same way `flags.ts`'s `identify()` does
     (hash of `x-forwarded-for`/`x-real-ip` + `user-agent`) — deliberately
     a **separate copy** of the djb2 `hashString` function rather than a
     shared import, since `flags.ts`'s copy has to stay Edge-runtime-safe
     for the `flags` package and this one is Node-only (calls Supabase).
   - Uses `createAdminClient()` (`src/lib/supabase/admin.ts`) to
     read-then-upsert the row, incrementing `visit_count`.
   - Fails open (`return false`, log the error) on any DB error — a
     tracking hiccup should never break the page for a real visitor.
   - Returns `visit_count >= 2`.

3. `src/app/verified-badge-invoices/page.tsx` — call
   `recordVisitAndGetIsRepeat("verified-badge-invoices")`; if `true`,
   override `pillCopy` with the fixed revisit copy regardless of
   `ctaVariant`. Button/heading unaffected.

4. `src/app/verified-badge-invoices/guide/page.tsx` — call the same
   function (ignore the return value, no pill on this page) purely so
   reading the guide counts toward the combined visit total.

5. Apply the migration via the Supabase SQL editor (no linked CLI in this
   repo — see [[supabase-migration-workflow]]), then build/typecheck,
   commit, hand off deploy.

**Not yet decided / worth a second look when resumed:** whether a hard
refresh mid-session should really count as a second "visit" (it will,
with this design — no session-level dedup) — acceptable for a first cut,
but flag it before shipping in case it's not the sensitivity Michael
actually wants.
