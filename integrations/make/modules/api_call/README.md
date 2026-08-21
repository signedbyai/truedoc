# Make an API Call (universal module)

Type: **Action**. Added 2026-08-19 to close the "universal module for
broader functionality" gap in Make's public-app review checklist
(developers.make.com/custom-apps-documentation/app-review/prerequisites) —
none of the 5 named modules (Send Document, Find Document, Watch Completed,
Watch Declined, New SignedBy Event) serve this role; this one lets a
scenario call any SignedBy REST API v1 endpoint the named modules don't
cover, without needing a new module built for every future endpoint.

**Rebuilt 2026-08-21 as a proper Make Universal (REST) module.** Original
version only exposed Method/URL/Body. Now also exposes **Headers** and
**Query string** as Make's standard key/value array parameter (`type:
"array"`, collection spec of `key`/`value`), folded into the real request
object in `communication.imljson` via the canonical
`{"{{...}}": "{{toCollection(parameters.headers, 'key', 'value')}}"}`
spread-key merge — this is the documented pattern for Make universal
modules (developers.make.com/custom-apps-documentation, "Universal
actions"), not a bespoke one. `Content-Type: application/json` is still
set by default and can be overridden by an explicit `Content-Type` row in
Headers, since Base's headers merge with (not replace) the module's own.

**Body is `type: "any"`, not plain text.** Make will pass a string value
through byte-for-byte (so a hand-typed raw JSON string still works exactly
as before, and SignedBy's `request.json()` parsing on every `/api/v1/*`
route handles it normally), but also accepts a mapped/structured value —
Make JSON-stringifies automatically when `body` is a mapped object rather
than a plain string. This is strictly more flexible than the original
free-text-only field and still doesn't depend on any `parseJSON`-style IML
function whose exact name/behavior wasn't confirmed via docs.

**Auth and base URL are inherited automatically** from `base.imljson`
(baseUrl `https://signedby.ai/api/v1`, `Authorization: Bearer
{{parameters.apiKey}}`).

**Not yet live-tested.** Rebuilt as a local scaffold following the same
pattern as the other 5 modules (see MAKE_INTEGRATION_SCOPE.md) — needs to
be pasted into Make's live Custom Apps Editor (org 8704380, app
`custom-app-ged4el`) and exercised with a real call (e.g. `GET /documents`
with a `qs` row, and a `POST` with both a `headers` row and a raw JSON
`body`) before being considered done.
