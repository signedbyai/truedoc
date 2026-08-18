# API usage visibility — scope

Status: **scoping, decisions locked in 2026-08-18, not built yet**.
Prompted by a direct question while reviewing Ignacio Barrios's feedback
("biggest opportunity is embedding SignedBy into workflows... that
probably means going quite heavy on integrations/API") — Michael asked
whether API usage is tracked anywhere, and then: "Can I even see what CRM
is calling the API?" Checked the code: the answer today is no, on both
counts. This scopes the lean fix. Say the word when ready to build.

## What exists today (confirmed by reading the code, not assumed)

- `authenticateApiRequest()` (`src/lib/api-auth.ts`) is the single choke
  point every `/api/v1/*` route and `/api/mcp` go through — 10 handlers
  across 9 route files (`documents` GET/POST, `documents/bulk-send` POST,
  `documents/[id]` GET, `documents/[id]/signed-file` GET,
  `documents/[id]/certificate` GET, `documents/[id]/void` POST,
  `documents/[id]/badge` GET, `templates` GET, `mcp` POST). It does **no
  logging of any kind** on a successful call — no row written, no
  `console.log`, nothing.
- No `api_usage`/`api_requests` table exists anywhere in the schema.
- No `last_used_at` (or equivalent) on the org's stored API key — you
  can't tell if a key that was ever generated has been used since.
- No User-Agent (or any request metadata) is read anywhere in the v1/mcp
  routes — even eyeballing "this looks like Zapier/Make" isn't possible
  today because the code never looks at that header.
- Outbound webhook delivery (`src/lib/webhooks.ts`) is explicitly
  "fire-and-forget-plus-one-retry only — no persistent delivery log."
  Same blind spot on the webhook side.
- The **only** API-adjacent number that reaches the daily admin-digest
  today is `apiCapHitsMonth` — count of **free-tier orgs getting blocked**
  by the 3-doc/month cap when calling via the API (`plan_cap_hits` table,
  `source = 'api_v1_documents'`). That's an anti-signal (someone hitting a
  wall), not a usage signal — and it says nothing about paid orgs, who can
  call the API all day with zero trace anywhere.
- CRM/MCP Phase 1 (multi-signer send, list/get documents & templates,
  void, outbound webhooks with all 4 lifecycle events) shipped to
  production 2026-07-30 and Michael smoke-tested it himself end-to-end —
  but that was a one-time manual test. Nothing since then confirms whether
  any real customer has ever called it.

## The fix — one table, one write site, one digest section

Deliberately mirrors the existing `plan_cap_hits` pattern (same shape of
problem: "how do I know this is happening" answered with one lean table
plus a digest section, not a new admin dashboard page).

### 1. New table: `api_usage`

```sql
create table if not exists public.api_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  method text not null,        -- "GET", "POST", etc.
  endpoint text not null,      -- pathname, e.g. "/api/v1/documents", "/api/mcp"
  user_agent text,             -- raw header, nullable — the tool-identification signal
  created_at timestamptz not null default now()
);

alter table public.api_usage enable row level security;
-- same as plan_cap_hits: RLS on, no policies. Service-role only, both
-- write (api-auth.ts) and read (admin-digest cron).

create index if not exists api_usage_created_at_idx on public.api_usage (created_at);
create index if not exists api_usage_org_id_idx on public.api_usage (org_id);
```

Next migration number: `0059_api_usage.sql` (last is `0058_euroltv_waitlist.sql`).

### 2. One write site: inside `authenticateApiRequest()`

Log immediately before returning `{ ok: true, ... }` — after the org is
known, before any route-specific business logic runs. This is what makes
it a single choke point: every current route already flows through here,
and every *future* `/api/v1/*` or `/api/mcp` route gets covered for free
without remembering to instrument it individually.

- `endpoint` = `new URL(request.url).pathname` (request is already a
  parameter — no signature change needed).
- `method` = `request.method`.
- `user_agent` = `request.headers.get("user-agent")`.
- Written via a fresh admin client, same as `checkFreePlanDocCap` does for
  `plan_cap_hits` — regardless of which client authenticateApiRequest was
  otherwise using.
- Wrapped so a logging failure **never** blocks or fails the real request
  (identical guarantee to the cap-hits logging).

**Deliberately not logged:** failed-auth attempts (bad/missing API key) —
those have no `org_id` to attribute to, and a failed-auth counter is a
different question (abuse/security) from "is this org's integration being
used," which is what's being asked here. Can be scoped separately later if
wanted.

**Deliberately not tracked:** whether the request eventually *succeeded*
past auth (e.g., a 500 later in the route). Capturing that would mean
wrapping every route's response instead of one shared auth function — a
bigger lift for a question ("is anyone calling this at all") that doesn't
need it. Worth revisiting only if usage shows up and the next question
becomes "is it reliable," not "does it exist."

### 3. One section, on the existing digest, same recipients as today

Reversed from an earlier draft of this scope, which had split this into
two emails (one aggregate-only to the shared `to`+family-`bcc` list, one
named-detail email to Michael alone) specifically to keep customer org
names away from the four family BCC addresses. Michael's call: don't
split it — "let's just keep it all the same email for all — if it becomes
a problem I will remove the users later from the BCC." So this is now a
single new "API usage" section added to the existing admin-digest
(`src/app/api/cron/admin-digest/route.ts` / `sendAdminDigestEmail` in
`src/lib/email.ts`), same `to: michael@signedby.ai` + family `bcc` as
every other section, org names included:

- Distinct orgs that called any `/api/v1/*` or `/api/mcp` endpoint —
  today / this week / this month.
- Total call volume — today / this week / this month.
- Per-org breakdown for the month: org name + call count + most recent
  call timestamp + guessed tool (from the User-Agent substring match
  below). Fine to list in full at current scale; revisit as a "top N" if
  this ever gets long.
- Rough User-Agent bucket tally for the month — group by a simple
  substring match (Zapier, Make, Postman, curl, python-requests,
  node-fetch/axios, everything else as "other/unrecognized") — the actual
  answer to "can I see what CRM is calling the API," to the extent a UA
  string reveals it.
- **New integrators this period** (see below).
- Most recent call timestamp, as a freshness check at a glance.

If the BCC list is trimmed later (Michael's own note: "if it becomes a
problem I will remove the users later"), that's just editing `ADMIN_BCC`
in `admin-digest/route.ts` — no change needed here.

### 4. "New integrators this period" — derived from the same table, no new schema

For each `org_id` in `api_usage`, its **first-ever row** (`min(created_at)`
across all time, not just the reporting window) is that org's "started
integrating" moment. An org counts as a new integrator in a given digest
run if that first-ever row falls inside the run's window (today/this
week, whichever the digest is reporting). Surfaced as: org name,
first-call timestamp, endpoint, and guessed tool from that first call's
User-Agent.

No new table needed — this is a `group by org_id having min(created_at) >=
<window start>` query against `api_usage` itself, run alongside the
per-org breakdown above.

**Known first-run caveat, not a bug:** in the first reporting window(s)
right after this ships, *every* org that calls the API will look like a
"new integrator," because there's no history before ship date for any of
them to have an earlier row. This is expected and self-corrects within
the first cycle or two as the table accumulates real history — worth a
one-line comment in the code so it isn't mistaken for a bug on day one.

## Explicitly out of scope (so this doesn't quietly grow)

- No new admin dashboard page — stays inside the existing digest email,
  matching the doc comment already in `admin-digest/route.ts` ("so
  checking traction doesn't require building/maintaining a locked admin
  dashboard page").
- No automatic CRM/tool identification beyond the UA substring guess — no
  OAuth "connected app" registry, no asking integrators to self-identify.
- No change to auth, billing, or rate-limiting behavior. Pure
  observability, additive only.
- No retroactive backfill — only counts calls from whenever this ships
  forward.
- No pruning/retention policy for `api_usage` rows — same as
  `plan_cap_hits`, let it grow for now; revisit if it ever becomes a real
  storage concern.
- Webhook *delivery* logging (success/failure per endpoint) is a related
  but separate gap — not touched here. Could be a fast-follow if this
  surfaces real webhook usage worth monitoring more closely.

## Decisions locked in — 2026-08-18

1. **`/api/mcp` counted together with REST `/api/v1/*`** — one table, one
   set of sections, no split. Confirmed: "yes fine to group together for
   now."
2. **Org names: yes, on the existing single digest email, same recipients
   as today (`to` + family `bcc`) — no split.** First confirmed narrower
   ("only on the version that goes to me"), then Michael reversed that:
   "actually let's not split the email list, let's just keep it all the
   same email for all — if it becomes a problem I will remove the users
   later from the BCC." §3 above reflects the final, single-email version.
3. **New-integrator flagging: yes.** Confirmed: "a someone just started
   integrating would be good to know." See §4 above.
