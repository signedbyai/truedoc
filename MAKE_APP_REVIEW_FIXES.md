# Make public-directory submission — fixes for the 2 review gaps

Status: **code/config written 2026-08-19, NOT yet live** — Make's app is
built and maintained in the live web editor (org 8704380, app
`custom-app-ged4el`), not synced from this repo automatically, so these
local files are a scaffold that still needs to be pasted into that editor
and tested, same workflow as the original 5 modules
(see MAKE_INTEGRATION_SCOPE.md). The backend change also needs a normal
review/commit/push/deploy — this sandbox can't push
([[sandbox-no-git-push-credentials]]).

Follow-up to [[crm-marketplace-visibility-2026-08-19]], which found 2 real
gaps blocking submission to Make's public app directory.

## Gap 1 — no universal module. FIXED (scaffolded).

New module: `integrations/make/modules/api_call/` (Action type — "Make an
API Call"). Exposes Method (select), URL (relative path, text), and an
optional raw-JSON Body (multiline text). Inherits `baseUrl` and the
`Authorization` header from `base.imljson` automatically; only adds
`Content-Type: application/json` itself. Body is passed through as a raw
string rather than parsed, specifically to avoid depending on an unverified
IML JSON-parsing function name — see the module's own README.md for the
full reasoning. Lets a scenario hit any current or future SignedBy REST API
v1 endpoint without a dedicated module existing for it.

## Gap 2 — no real pagination. FIXED where the backend allowed it; one new backend change included.

**`GET /api/v1/documents` already supported `limit`/`offset`/`total`/
`has_more`** (built during the original CRM_MCP_READINESS_PHASE1_SCOPE.md
work, confirmed by reading the live route) — the gap was purely that
`watch_completed` and `watch_declined`'s `communication.imljson` never used
it. Both now have a `pagination` block (`qs.offset` driven by Make's
`pagination.page`, stopping on `body.has_more`), per the syntax documented
at developers.make.com/custom-apps-documentation/component-blocks/api/pagination.

**`GET /api/v1/templates` had NO pagination at all** — real backend gap,
not just a Make-config one. Fixed in `src/app/api/v1/templates/route.ts`:
added the same `limit`/`offset`/`total`/`has_more` shape `/documents`
already returns. **Deliberately backward-compatible**: default limit is
500 (not a small page size), specifically so every existing unpaginated
caller — the `list_templates` RPC's dropdown use in both Make and Zapier,
and anything else hitting this route with no query params — keeps getting
"everything" in one call exactly as before, for any real org (no org has
500+ templates today). This is additive, not a behavior change, unless a
caller explicitly passes `limit`/`offset`. `integrations/make/rpc/
list_templates/communication.imljson` now has the same `pagination` block
as the two watch_* modules, so a very large template list would actually
page through correctly if it ever came up.

**`find_document` needs no changes** — it's a single-ID lookup, not a
list/search, so pagination doesn't apply.

## What this does NOT fix yet — still open from the original review

- **Test scenarios**: the ones used to verify each module during the
  original build were deleted afterward to keep the org's scenario list
  clean. Make's submission checklist wants scenarios demonstrating every
  module plus a dedicated error-handling scenario — none currently exist
  as artifacts. Needs rebuilding live in the editor, and this time keeping
  them rather than deleting them, once this round of changes is pasted in
  and tested.
- **Module-level metadata** (name/description/icon per module) lives only
  in Make's live editor, not in any local file — still unverified against
  Make's "well-labeled and described modules" requirement; needs a pass
  inside the editor.
- **Error-handling specificity** — `base.imljson`'s error message is one
  generic template across all status codes (401/429/5xx alike). Not
  changed in this pass; flagged as lower-confidence on whether it actually
  blocks approval, worth a look before submitting either way.

## Next step

1. Review the `templates/route.ts` diff, commit, push, deploy — needed
   before the templates pagination change is real (the Make/Zapier configs
   referencing `has_more`/`offset` on `/templates` will just silently get
   those fields ignored by a not-yet-deployed backend otherwise, not break
   anything, but won't do anything useful either until it ships).
2. Once deployed, paste the new `api_call` module and the 3 updated
   `communication.imljson` files into Make's live editor and test each —
   same live-Chrome-session workflow as the original build.
3. Rebuild and keep test scenarios per module + one error-handling
   scenario.
4. Check module metadata/descriptions/icons in the editor.
5. Then submit for Make's public-directory review.
