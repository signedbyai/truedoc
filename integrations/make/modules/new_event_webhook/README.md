# New SignedBy Event (instant trigger)

Type: **dedicated webhook, "not attached"** (Make's term for a webhook whose
subscribe URL the user pastes into the target service manually, because that
service has no API-endpoint-based way to register it — see
MAKE_INTEGRATION_SCOPE.md, "why the instant trigger works without a backend
change").

There is no `communication.imljson` for attach/detach here on purpose — "not
attached" webhooks don't call an attach endpoint at all. The only thing this
module needs is the interface (above), which describes the JSON body
SignedBy's existing outbound-webhook system already POSTs (see
`src/lib/webhooks.ts`, `dispatchWebhookEvent`):

```json
{
  "event": "document.completed",
  "occurred_at": "2026-08-18T10:15:00.000Z",
  "document_id": "...",
  "title": "Sample Agreement",
  "status": "completed"
}
```

`signer` is present on `document.viewed` / `document.signed` / `document.declined`,
omitted on `document.completed` (not about one signer). Since
`dispatchWebhookEvent` sends every event type to every enabled endpoint (no
per-event filtering exists server-side — confirmed in webhooks.ts), this
module surfaces ALL four event types on one trigger. Zap-equivalent
filtering (e.g. "only continue if event = document.completed") happens with
Make's standard built-in Filter on the connection between modules — this is
normal Make usage, not a gap.

**Signature verification — flagged, not built.** Every delivery carries an
`X-SignedBy-Signature: sha256=<hmac>` header (secret shown once when the
webhook endpoint is created in SignedBy's dashboard). Make's custom webhook
definitions can validate this in principle via an IML `sha256`/`hmac`
function on the webhook's validate step, but the docs fetch for that
specific mechanic didn't return verifiable detail during this build —
needs confirming directly in the Make editor before relying on it. Until
then this ships unverified, same trust model as an unauthenticated inbound
webhook — acceptable for v1 (mirrors how most first-version Zapier/Make
webhook integrations ship), but worth tightening as a fast-follow.
