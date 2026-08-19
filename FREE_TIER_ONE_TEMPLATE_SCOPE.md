# Free tier: allow 1 self-saved template — SCOPE, NOT BUILT

2026-08-19, direct instruction: "Let's scope a broader fix where the free
tier is allowed 1 template." Follows [[FREE_TEMPLATE_SANDBOX_SCOPE.md]]
(seeded shared Example Agreement into every Free org) — this is the
broader version: Free gets to save **one template of its own**, not just
the generic shared one.

**This is a scope doc only.** Nothing below is built. Answering the open
questions in it is not approval to build — confirm the plan, then say go.

## Current state (verified in code, 2026-08-19)

`FEATURE_PLANS.templates` in `plan.ts` is `["starter","team","business"]`
— an all-or-nothing gate. Five call sites enforce it:

1. `app/api/documents/[id]/save-as-template/route.ts:28` — dashboard field
   editor's "Save as template" action. Hard 402 for Free.
2. `lib/console-actions.ts:507` (`saveAsTemplateAction`) — Console chat's
   "Save now" flow (upload → AI-suggested fields → save, no field-editor
   visit). Hard 402 for Free.
3. `app/api/templates/[id]/use/route.ts:48` — dashboard "Use template"
   (create a draft from a template). Hard 402 for Free — this is the one
   that would have blocked Free from using even a self-saved template.
4. `app/dashboard/templates/page.tsx:17` — the whole Templates page.
   `!hasTemplates` skips the DB query entirely and renders only an
   upgrade card — a Free org's templates are invisible here regardless of
   whether any exist.
5. `field-editor.tsx` (lines ~2086, ~2424) — receives `hasTemplates` as a
   prop from `dashboard/documents/[id]/page.tsx:82`; drives the "Save as
   template" button's own visible state inside the editor.

Two places already do **not** gate on `templates` and would need no
change: `lib/console-actions.ts`'s `listTemplatesAction` / Console's
`GET /api/console/templates` (Templates tab) both only check
`consoleAccess`, which Free already has — a self-saved template would
show up there automatically. Same for the REST API's `GET
/api/v1/templates`. There is no `POST /api/v1/templates` today — template
creation only happens through the dashboard field editor or Console
chat's "Save now," both listed above.

`DELETE /api/templates/[id]` has no plan gate at all — any org can delete
its own template today. Relevant because it means a Free org capped at 1
isn't stuck: delete the one it has, save a different one.

## Proposed design

Free orgs get a cap of **1 self-saved template**, counted separately from
the shared seeded Example Agreement (identified by `base_file_path =
'templates/system/example-agreement.pdf'`, see `example-template.ts`) —
saving your own template doesn't touch or replace the example, and the
example doesn't count against the cap. A Free org can therefore have the
example row plus up to one real one.

New helper in `plan.ts`, e.g. `checkFreePlanTemplateCap(supabase, orgId)`
— **structurally different from `checkFreePlanSendCap`/
`checkFreePlanSealCap`**, which both reset monthly (`sent_at`/`sealed_at`
this month). A template isn't a monthly-consumed action, it's a
standing-count resource — the check is "how many rows does this org
already own," not "how many this month," and it never resets on its own
(only deleting the existing one frees the slot). Worth being explicit
about this difference before implementing, since copy-pasting the monthly
pattern would be wrong here.

Call sites to update:
- `save-as-template/route.ts` and `saveAsTemplateAction`: replace the
  hard `if (!planHasFeature(..., "templates"))` block with — paid plans
  unchanged (unlimited); Free checks the new cap (count of non-example
  templates for the org < 1) and either saves or returns a 402 with an
  upgrade message ("You've saved your free template. Upgrade to Pro for
  unlimited.").
- `templates/[id]/use/route.ts`: currently blocks Free outright. Needs to
  allow using a template the org actually owns (its example, or its one
  self-saved one) regardless of plan — the block was really "Free has no
  templates to use," not "Free may never use a template," and that
  premise is gone once Free can own one.
- `dashboard/templates/page.tsx`: replace the all-or-nothing gate with an
  actual list for every plan. Free sees its example + its one custom slot
  (if used) with a "1 of 1 custom templates used — upgrade for unlimited"
  line instead of the current "Upgrade to Pro" wall; Save-as-template
  button inside `field-editor.tsx` needs the same at-cap messaging
  (currently just toggles on `hasTemplates` — needs a third state:
  "can save," "at cap, show upgrade," rather than the current boolean).

## Open decisions — need your call before building

1. **Does the 1-template cap include reminders access for that template,
   or does `reminders` stay Pro+-only regardless?** Pricing page currently
   bundles them as one line ("Templates & reminders"). Recommend: leave
   `reminders` untouched (still `["starter","team","business"]|) — this
   scope is specifically about trying the send flow, not the ongoing
   nag-a-signer convenience feature. Flag if you want it included instead.
2. **Pricing page copy** (`pricing-cards.tsx`) — Free's feature list would
   plausibly gain a "1 saved template" line; Pro's "Templates & reminders"
   line likely needs to become "Unlimited templates & reminders" so the
   tiers still read as clearly different. This directly touches the
   Free→Pro conversion pitch — wanted your eyes on the exact wording
   before it ships, not just mine.
3. **Bulk-send interaction** — a self-saved template is usable with
   `bulkSend` (Team+) exactly like today; no change there. But recall
   [[free-template-sandbox-2026-08-19]] flagged that Console chat's
   `bulk_send` tool has no `bulkSend` plan gate at all — a Free org with
   its own template could reach Console's `bulk_send` today already (the
   pre-existing gap, still unfixed). Worth deciding whether THIS pass
   finally closes that, since giving Free a real template of its own
   makes that gap more likely to actually get exercised, not just
   theoretical.
4. **Any upsell/analytics hook wanted** — e.g. logging when a Free org
   hits the 1-template cap (same `plan_cap_hits` pattern used for the
   3-docs/month cap), so you can see how often this actually gets people
   to upgrade versus just sitting unused.

## Explicitly out of scope for this pass

- No change to `bulkSend`, `aiDraft`, `pageViewTracking`, `branding`,
  `apiAccess`, `paymentCollection`, or `docGate` gates — all stay exactly
  as they are.
- No change to the 3-docs/month send cap or 3-seals/month cap — a Free
  org's one custom template still only sends within those existing
  limits.
- No new migration — this counts existing `templates` rows, no schema
  change needed.

## How to apply

Once the open decisions above are answered: implement the `plan.ts`
helper, update the 5 call sites listed, update pricing copy, `tsc
--noEmit` + `eslint` clean (same verification pattern as
[[free-template-sandbox-2026-08-19]]), commit locally, hand off
push/deploy the same way every other change from this environment does.
