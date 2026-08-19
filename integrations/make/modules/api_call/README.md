# Make an API Call (universal module)

Type: **Action**. Added 2026-08-19 to close the "universal module for
broader functionality" gap in Make's public-app review checklist
(developers.make.com/custom-apps-documentation/app-review/prerequisites) —
none of the 5 named modules (Send Document, Find Document, Watch Completed,
Watch Declined, New SignedBy Event) serve this role; this one lets a
scenario call any SignedBy REST API v1 endpoint the named modules don't
cover, without needing a new module built for every future endpoint.

**Design choice — body is a raw string, not parsed JSON.** `parameters.body`
is typed as free-text and passed straight through as `communication.body`.
Make sends a string `body` value as the literal request payload (it only
JSON-stringifies when `body` is a mapped object) — so the user types valid
JSON by hand and it goes out byte-for-byte, and SignedBy's existing
`request.json()` parsing on the receiving end (see every `/api/v1/*`
route) handles it normally. This avoids depending on a `parseJSON`-style
IML function whose exact name/behavior in this Make account version
wasn't confirmed via docs during this build (Make's public function
reference didn't resolve to specifics during this session's research) —
raw pass-through is the lower-risk choice and doesn't require guessing at
an unverified function name.

**Auth and base URL are inherited automatically** from `base.imljson`
(baseUrl `https://signedby.ai/api/v1`, `Authorization: Bearer
{{parameters.apiKey}}`) — this module only needs to add
`Content-Type: application/json`, since Base's headers merge with, not
replace, a module's own.

**Not yet live-tested.** Built as a local scaffold following the same
pattern as the other 5 modules (see MAKE_INTEGRATION_SCOPE.md) — needs to
be pasted into Make's live Custom Apps Editor (org 8704380, app
`custom-app-ged4el`) and exercised with a real call (e.g. `GET /documents`)
before being considered done, exactly like the other modules were
live-tested 2026-08-18. Flag if `parameters.body` needs quoting/escaping
help text expanded once tested against a real multi-line JSON paste.
