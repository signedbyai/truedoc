# Free-tier template sandbox — 2026-08-19

**Status: BUILT.** Direct instruction: "I think templates may have to work
in the free version of the product since people can't really try out the
API unless they have access to it."

## The gap, confirmed in code before building anything

Free orgs already get a real API key and pass auth on `POST
/api/v1/documents` (`freeCapped: true`, capped at the same 3
documents/month the dashboard enforces — see `api-auth.ts`,
`API_TIER_SCOPE.md`). That was built 2026-08-02 specifically to mirror how
SignNow/eSignatures.com position their own free/sandbox tiers.

But that route (and Console chat's `send_document`/`bulk_send` tools)
require a `template_id` the org owns, and saving a template (`templates` in
`plan.ts`) is Pro+-only. So a Free-tier developer could generate a key,
authenticate successfully, and then had nothing to actually send — the
sandbox existed on paper but dead-ended immediately. This exact tension was
already flagged once before and deliberately left unresolved
(`CONSOLE_FREE_TIER_SCOPE.md`, 2026-08-02: "Free's real console value is
Verified Badge sealing only for now").

## What shipped

**Does NOT touch the `templates` paywall.** Free still can't save or
customize its own templates — creating one is still Pro-only. What changed
is narrower: every Free org (new and existing) now gets the same shared,
generic "Example Agreement" template every Pro+ org already gets via
`example-template.ts`'s `seedExampleTemplateIfNeeded` — one real
`template_id` to test create-and-send against, on both the REST API and
Console chat.

1. **New signups** — `example-template.ts` gained
   `seedExampleTemplateForNewUser(userId)`, which resolves the user's
   personal org (auto-created by the `0002_new_user_org.sql` DB trigger)
   and calls the existing `seedExampleTemplateIfNeeded`. Wired in
   fire-and-forget (`void`, same contract as the existing Stripe-webhook
   call site) at all three first-login points: `login/actions.ts`'s
   `verifyLoginCode` and `signInWithPassword`, and `auth/callback/route.ts`
   (magic link / OAuth).

2. **Existing Free orgs** — `scripts/backfill-example-templates.js`
   widened from `["starter","team","business"]` to also include `"free"`.
   Same network constraint as its original run: can't execute from the
   sandbox or the device bridge (both blocked from Supabase/R2), needs to
   run from a machine with real internet access, same instructions as
   before. Safe to re-run — idempotent per-org existence check.

3. **Console chat's free-tier metering — a real gap this surfaced.**
   Seeding the template makes Console's `send_document`/`bulk_send` tools
   reachable for Free orgs for the first time. `api/console/chat/route.ts`
   previously hardcoded `const metered = true` for every plan — Console is
   deliberately metered "over and above standard plans" even for Business
   (2026-07-30 decision), via a $/doc spend-cap mechanism
   (`checkConsoleCap`: 100 free units/month, then billed against the org's
   Stripe subscription). Free orgs have no subscription to bill against,
   and 100/month is nowhere near the Free plan's actual 3-documents/month
   promise — this was harmless only because Free could never reach
   `send_document` before. Fixed by branching on `org.plan`: paying plans
   keep `metered: true` (unchanged); Free gets `freeCapped: true` instead,
   which routes through the same `checkFreePlanSendCap` (3/month) the REST
   API and dashboard already use. Threaded through
   `runConsoleChatTurn` → `executeTool` → `sendDocumentAction`/
   `bulkSendAction` (`console-chat.ts`, `console-actions.ts`) as a new
   optional `freeCapped` param, defaulting to `false` so every existing
   caller (the REST API's `/api/v1/documents/bulk-send`, which is
   deliberately always-metered regardless of plan) is unaffected.

## Verified

`tsc --noEmit` and `eslint` clean on every touched file (from the device
bridge — `mac-nodemodules-linux-binding-contamination.md` still applies,
so `vitest`/`next build` weren't attempted here; existing
`console-actions.test.ts`/`console-chat.test.ts` don't call the functions
whose signatures changed, only pure helpers, so they're expected
unaffected — worth a real `npm test` run to confirm). Committed locally on
`master`; **not pushed or deployed** (same sandbox/device-bridge
limitation as every other session — see `sandbox-no-git-push-credentials.md`).

## Known, deliberately out of scope

**Console chat's `bulk_send` tool has no `planHasFeature(..., "bulkSend")`
gate at all** — unlike `/api/v1/documents/bulk-send` (which correctly
requires Team+), `console-chat.ts`'s tool-execution switch calls
`bulkSendAction` for any plan with a reachable template. This is a
pre-existing gap, not introduced or fixed by this pass — before today it
only mattered for Pro (which has real templates but shouldn't have
bulk-send); now Free can reach it too, at least correctly bounded by the
Free 3-sends/month cap so it's not a runaway-cost issue, just a
pricing-tier leak (a Free or Pro org getting a Team+ feature through
Console chat). Flagged for its own decision, not fixed here — would need
its own `planHasFeature` check inside `executeTool`'s `bulk_send` case.

## How to apply

Deploy this the normal way (dev → verify → prod, `deploy-prod.sh`/
`deploy-dev.sh`). After deploy: (1) run the widened backfill script from a
machine with real network access to cover existing Free orgs, (2) new Free
signups are covered automatically going forward, no action needed, (3) a
real end-to-end test worth doing once live: sign up a fresh Free account,
generate an API key, `GET /api/v1/templates` (or `list_templates` in
Console chat) to confirm the Example Agreement shows up, then `POST
/api/v1/documents` against it and confirm it sends and the 4th attempt in
a month gets the 402.
