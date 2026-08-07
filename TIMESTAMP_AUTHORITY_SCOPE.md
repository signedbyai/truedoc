# RFC 3161 trusted timestamp — scope

Status: BUILT 2026-08-03, on direct instruction. Sectigo-primary/FreeTSA-
fallback via `pdf-rfc3161`, migration 0045 (timestamp_token/timestamp_tsa/
timestamp_gen_time on audit_events), wired into generate-signed-pdf.ts
(timestamps finalBytes as the LAST step, after addCertificatePage —
deliberate deviation from this doc's original plug-in point, see that
file's comment for the ByteRange/resave-invalidation reasoning) and
verified-badge-actions.ts's "separate" branch. All "Copy surfaces to
update" below are done: badge footer, certificate page (generic/TSA-
agnostic line only — drawn before the timestamp exists), /verify +
/api/verify (TSA-branched, FreeTSA caveat), /verified-badge FAQ, hero
image regenerated. Migration + deploy owed — cannot be verified against
real Sectigo/FreeTSA network calls from the sandbox (network restriction),
so a live round trip needs post-deploy confirmation. /privacy + /dpa
disclosure line NOT done (flagged, not required).

**Deploy confirmed 2026-08-07 via Vercel MCP:** production is running
commit `a834083`, which sits on top of `f03ef95` — the code is live.
**Migration 0045 confirmed applied 2026-08-07** (direct confirmation) —
`timestamp_token`/`timestamp_tsa`/`timestamp_gen_time` exist on
`audit_events` in production. Code + schema are both live. **End-to-end confirmed 2026-08-07:** a real `audit_events` row shows
`timestamp_tsa: sectigo`, `timestamp_gen_time: 2026-08-06 20:17:51+00` —
a genuine Sectigo round trip succeeded in production. (Rows with NULL
`document_hash`/`timestamp_tsa` alongside it are expected — `created`/
`sent`/`signed`/`voided`/`consent_given` events never populate those
three columns; only the `completed` event does, in both
`verified-badge-actions.ts` and `sign/[token]/submit/route.ts` — checked
both, this is live for regular signed documents too, not just Verified
Badge ones, matching this doc's original "same default on both surfaces"
recommendation.) Pipeline is fully proven — the only remaining gate on
making public claims is the legal-copy review already flagged above. Follow-on to the badge-copy audit
that caught Verified Badge overclaiming "cryptographically verified
timestamp" ([[verified-badge-image-missing-text-fix]]-adjacent — see
`badge-asset.tsx`'s 2026-08-01 footer fix) when the timestamp today is
just a plain Postgres `created_at`. This doc scopes making that claim
genuinely true, not just toning it down further.

## Why this one

Two things are already cryptographic in the sealing pipeline
(`verified-badge-actions.ts` / `generate-signed-pdf.ts`): the SHA-512
hash of the stamped document, and the identity check (real Stripe
Identity, government ID + selfie, org-level, reused for 365 days). The
timestamp isn't — it's whatever `audit_events.created_at` says, which
only holds up if a verifier trusts SignedBy's own database. RFC 3161 is
the standard, decades-old fix for exactly this gap: a Time Stamping
Authority (TSA) cryptographically signs a document's hash together with
the current time, using a key held in a hardware security module.
Anyone can verify that signature later without trusting SignedBy at
all — only the TSA. DocuSign and Adobe Acrobat (via a configured TSA
URL) both already do this, mostly under "Long-Term Validation" (LTV)
rather than as headline marketing copy — it's closer to table stakes
for a compliance-adjacent product than a differentiator.

## Two tiers — deliberately scoping the smaller one

**Plain RFC 3161 timestamp** (this doc's scope): any TSA — free public
ones like FreeTSA.org, or cheap commercial ones (GlobalSign, DigiCert,
Sectigo, roughly $0.01–$0.10/timestamp) — signs the hash. Real
cryptographic proof of "existed by time T," independently verifiable
by anyone with standard tools. Its evidentiary weight in a dispute
rests on trusting that specific TSA's reputation and key.

**Qualified timestamp** (explicitly OUT of scope here): a timestamp
from a QTSP on the EU's official eIDAS trust list. Under eIDAS Article
41 this flips the burden of proof — the other party has to prove the
date is wrong, not SignedBy or the customer. This is the same tier
jump as AES→QES already sitting in the eIDAS/QES backlog note
([[product_backlog]]) — a real vendor relationship and compliance
commitment, not a library integration. Revisit together with that
entry if/when SignedBy pursues QES generally; don't build it as a
one-off here.

## Library

`pdf-rfc3161` (npm, MIT, confirmed real and actively maintained —
README fetched and read directly, not assumed from a search snippet).
Pure TypeScript, no native dependencies, runs on Node 20+, Cloudflare
Workers, Vercel Edge, and Deno — the exact constraint that mattered for
the badge-image font bug (native deps don't survive Vercel's
serverless runtime). Notable properties:

- `timestampPdf({ pdf, tsa: { url } })` embeds a real RFC 3161
  DocTimeStamp signature dictionary directly into the PDF — verifiable
  by Adobe Acrobat and any standard PDF/RFC-3161 tool, not just
  SignedBy's own `/verify` page. This is a stronger, more literal
  version of "show, don't just claim" than anything sealing does today.
- `enableLTV: true` (default since 0.2.0) embeds the TSA's certificate
  chain + revocation data, so the timestamp stays verifiable even after
  the TSA's own certificate expires — addresses the "what happens years
  later" question DocuSign's LTV design also solves for.
- `timestampPdfMultiple()` — get timestamps from more than one TSA on
  the same document, redundancy against any single TSA disappearing or
  being distrusted later. Cheap resilience upgrade, worth considering
  even without going as far as blockchain anchoring (separate,
  unrelated scoping thread).
- `extractTimestamps()` / `verifyTimestamp()` — needed for `/verify` to
  actually re-check a timestamp server-side rather than just trusting
  that one was once embedded.
- Ships its own SSRF protection (URL allowlist for AIA/OCSP/CRL
  fetches), on by default with no opt-out at the public-call level —
  relevant given this makes outbound requests to a TSA URL from a
  server action, same class of concern as anything else in this
  codebase that fetches a user- or config-supplied URL.

## TSA choice — the one real open decision

`KNOWN_TSA_URLS.FREETSA` works out of the box and costs nothing, but
FreeTSA uses a self-signed CA that isn't in standard trust stores —
verifying it requires manually installing FreeTSA's root certificate
first. That's a real problem for this specific feature: Verified
Badge's whole pitch is "no account needed to check it," and a
timestamp that needs a manual trust-store step to verify undercuts
that same honesty standard this doc exists to uphold. A commercial TSA
(GlobalSign, DigiCert, Sectigo) chains to a root already trusted by
every standard PDF viewer and OS trust store — verifiable by anyone,
no setup, matching the existing promise. Cost is genuinely small
(~$0.01–$0.10/timestamp; at current volume this is a rounding error
against the $0.25/document Console price, but worth naming as a real
new marginal cost line rather than silently absorbing it).

Recommendation: a paid commercial TSA from day one, not FreeTSA even
for a soft launch — the verifiability gap is the whole point of doing
this at all, and the cost difference at SignedBy's current volume is
negligible. FreeTSA stays useful for local dev/testing only.

## Where this plugs into existing code

`generate-signed-pdf.ts`'s `generateSignedPdf()` already computes
`hash = sha512(stampedBytes)` before appending the certificate page
(the same hash a Verified Badge seal's QR/verify URL is built from).
The natural integration point is right after that hash is computed:
call `timestampPdf()` (or the lower-level `TimestampSession` API, if
finer control over exactly what gets hashed is needed) against the
already-stamped bytes, before `addCertificatePage` runs — so the
certificate page's own text and the badge's footer copy can honestly
say "timestamp cryptographically verified" and cite which TSA. The
returned timestamped PDF becomes what's actually uploaded to R2 as
`signed_file_path` (or the standalone certificate, for `separate`
mode), same as today, just with a real RFC 3161 token embedded in it.

**Non-blocking on failure**, same philosophy already established for
badge generation (`generate-signed-pdf.ts`'s own comment: "Never lets
badge generation failure... block a signed PDF from finishing"). A TSA
being unreachable shouldn't stop a document from sealing — falls back
to today's plain-database-timestamp claim (now honestly worded, post
the badge-copy fix) rather than failing the whole seal. `pdf-rfc3161`
already returns typed errors (`NETWORK_ERROR` / `TSA_ERROR` /
`TIMEOUT`) that map cleanly onto that fallback branch.

**Data model:** new columns to actually persist the token (not just
trust that embedding it in the PDF once is enough — `/verify` and the
certificate page both need to read it back later). Likely on
`audit_events` alongside the existing `document_hash`: something like
`timestamp_token` (bytea, the raw DER-encoded token), `timestamp_tsa`
(text, which TSA), `timestamp_gen_time` (timestamptz, the TSA's own
attested time — distinct from `created_at`, which is just when
SignedBy's row was written). A new migration, applied the standard way
(Supabase SQL editor, no linked CLI — [[supabase-migration-workflow]]).

**Where the claim surfaces:** `/verify`, the certificate PDF page, and
the Verified Badge footer text (the thing this whole investigation
started from) can all honestly say "timestamp cryptographically
verified" once this exists — today only the certificate page avoided
overclaiming; this closes the gap properly instead of just wording
around it. `/verify` should ideally let a technical visitor actually
re-verify the token (surface the raw TSA response or at least name the
TSA + policy OID), not just assert it — same "show, don't just claim"
standard the badge visual itself is built on.

**Scope of application:** the existing badge/QR addition to
`addCertificatePage` deliberately applies to *every* signed document's
certificate page, not just Verified Badge ones (see
[[verified-badge-build]]'s "Related, smaller addition" section) —
recommend the same default here: every sealed/signed document gets a
real TSA timestamp, not a Verified-Badge-only special case. Keeps one
code path instead of two, and the honesty problem (an unverifiable
"cryptographic timestamp" claim) exists identically on both surfaces
today.

## Explicitly out of scope

- **Qualified/eIDAS timestamps** — a QTSP vendor relationship, not a
  library integration. See the eIDAS/QES backlog note.
- **Blockchain anchoring (OpenTimestamps/OriginStamp)** — a separate,
  different resilience property (verifiable with zero dependence on
  SignedBy's infrastructure at all, not just zero dependence on
  SignedBy's *claim* being honest) — being scoped as its own thread,
  not bundled into this one. See the "resilience for continuity"
  discussion this same audit raised.
- **Re-timestamping already-sealed historical documents** — this scope
  is forward-only (new seals get a real TSA timestamp); backfilling
  every existing sealed document is a separate, much larger batch job
  with its own cost multiplication, not assumed here.

## Effort

Small-to-medium — smaller than it might sound, since the hard part
(a maintained, dependency-free, edge-compatible RFC 3161 client) is
already solved by `pdf-rfc3161` rather than needing to be built from
the RFC text. Real work: the TSA account/API-key signup (a "your step"
item, same shape as the Trustpilot/Mistral-API-key items elsewhere in
this project), the migration, wiring the call into
`generate-signed-pdf.ts` with the non-blocking-failure branch, and
updating `/verify` + the certificate page + the badge footer copy to
state it accurately. Rough shape: comparable to the per-recipient
email-OTP feature already shipped ([[per-recipient-authentication]]),
not a new-product-surface-sized effort like Verified Badge itself was.

## SUPERSEDED by the decision below — kept for the reasoning

## Decided (2026-08-01, first pass): FreeTSA as a stopgap, not the final answer

Michael's call, against the doc's own recommendation above — noted
here rather than silently overwritten, since the reasoning against
FreeTSA (self-signed root, manual trust-store install to actually
verify, in tension with "no account needed to check it") still stands
and should be revisited, not forgotten. FreeTSA lets this ship with
zero signup friction and zero recurring cost while the rest of the
pipeline (data model, non-blocking-failure branch, `/verify`/
certificate-page/badge-footer copy updates) gets built and proven out.

**What "stopgap" means concretely:** `pdf-rfc3161`'s `tsa.url` is a
plain config value (`KNOWN_TSA_URLS.FREETSA` today), not something
baked into the data model — the `timestamp_tsa` column already scoped
above records which TSA issued a given token per-document, so swapping
to a commercial TSA later doesn't require a migration or touching
already-issued tokens, only changing the URL new seals request against
and, if wanted, backfilling messaging that some earlier tokens were
FreeTSA-issued vs. commercial-TSA-issued.

**Real product-copy consequence to flag at build time:** since FreeTSA
requires a manual root-cert install to verify, `/verify`'s "cryptograph-
ically verified timestamp" claim should either (a) say so plainly —
something like "timestamped via FreeTSA (RFC 3161); verifying
independently requires installing FreeTSA's root certificate" — or (b)
SignedBy's own `/verify` page does the verification server-side (via
`verifyTimestamp()`) and simply reports the result, so an ordinary
visitor never needs to install anything themselves and only a
technically inclined person trying to *independently* re-verify would
hit that friction. (b) is the better default — matches how the badge
already works today (SignedBy's own page confirms things, no manual
step required to trust the everyday case) — but worth being explicit
about in the build so the copy doesn't imply full doorstep verifiability
it doesn't yet have with a self-signed-root TSA.

**Revisit trigger:** same as noted above — worth swapping to a paid
commercial TSA once cost is no longer the binding constraint, or if a
customer/prospect ever specifically pushes back on FreeTSA's
trustworthiness.

## Decided (2026-08-01, final): Sectigo's public TSA as primary, FreeTSA as the fallback

Revised after checking real vendor pricing pages rather than trusting
a generic "$0.01-0.10/timestamp" search snippet — that per-call paid
tier doesn't actually exist as a self-serve product (GlobalSign bundles
timestamping into an annual per-identity certificate product, not a
backend-callable API; DigiCert's enterprise timestamping is quote-only).
What does exist, free, discovered while checking that: **Sectigo and
DigiCert both run free public RFC 3161 endpoints**
(`http://timestamp.sectigo.com`, `http://timestamp.digicert.com`) that
chain to real, already-trusted roots — unlike FreeTSA's self-signed
one. That removes the exact objection raised against FreeTSA (manual
root-cert install required to independently verify) at the same $0
cost. Picking Sectigo as primary (arbitrary between the two — DigiCert
is an equally valid swap if Sectigo ever proves unreliable).

**Michael's refinement:** use Sectigo's public TSA as primary, with
FreeTSA as an automatic fallback if Sectigo fails or can't be reached —
not a manual switch, a runtime decision per seal.

**Design:** a small wrapper around `pdf-rfc3161`'s `timestampPdf()`,
sitting where the doc's "Where this plugs into existing code" section
already identified (right after `generate-signed-pdf.ts` computes its
hash, before `addCertificatePage`):

```ts
async function timestampWithFallback(pdfBytes: Uint8Array) {
  try {
    return { ...(await timestampPdf({ pdf: pdfBytes, tsa: { url: SECTIGO_TSA_URL }, enableLTV: true })), tsa: "sectigo" as const };
  } catch (err) {
    if (!(err instanceof TimestampError)) throw err; // unexpected error shape — don't silently swallow
    try {
      return { ...(await timestampPdf({ pdf: pdfBytes, tsa: { url: KNOWN_TSA_URLS.FREETSA }, enableLTV: true })), tsa: "freetsa" as const };
    } catch {
      return null; // both TSAs unreachable — non-blocking, seal proceeds with today's honest DB-only timestamp claim
    }
  }
}
```

Three real outcomes per seal, all handled: Sectigo succeeds (the common
case — real trusted-root timestamp, no caveats needed in copy), Sectigo
fails but FreeTSA succeeds (still a real RFC 3161 timestamp, but
`/verify` needs the FreeTSA-specific "installing a root certificate" caveat
from the superseded section above — the copy has to be TSA-aware, not
one fixed sentence, since the two outcomes carry different verifiability
claims), or both fail (falls through to the existing non-blocking
behavior already established for badge generation — sealing never blocks
on this).

**Data model, unchanged from the FreeTSA-only pass:** the already-scoped
`timestamp_tsa` column is what makes the fallback legible after the
fact — `/verify` and the certificate page branch their copy on its
value (`"sectigo"` vs `"freetsa"`) rather than assuming one fixed TSA.

**Still free, still a stopgap by the same original logic:** neither
Sectigo's nor DigiCert's public server has a published SLA or
commercial-use terms — this is a materially better free option than
FreeTSA alone, not a substitute for eventually having a real paid/
contracted TSA relationship if volume or a customer ever makes that
worth doing. Same revisit trigger as before.

## Copy surfaces to update once this is built

Checked each of these against the real current copy (not assumed) —
this is the concrete "what actually needs to change" checklist for
whoever picks this up, so it doesn't need rediscovering from scratch.

**Definitely changes:**
- Badge footer (`badge-asset.tsx`): "File hash and identity
  cryptographically verified" → back to including timestamp, honestly,
  e.g. "File hash, timestamp, and identity cryptographically verified."
  Requires regenerating `public/hero-verified-badge.png` (same
  mechanical step as the QR-fix and footer-text-fix before it) — which
  also regenerates the OG card, since `verified-badge/opengraph-image.tsx`
  embeds that same file.
- Certificate PDF page (`addCertificatePage`, `generate-signed-pdf.ts`)
  — applies to *every* signed document, not just Verified Badge ones.
  Currently: "reflects the identity check and file hash captured at
  the time of sealing" + the SHA-512 checksum line. Needs a line naming
  the TSA and the timestamp's actual signed (genTime), not just the
  hash.
- `/verify/page.tsx` — currently: "This confirms the file existed,
  unaltered, as of the sealed timestamp above, sealed by a verified
  individual," where "sealed timestamp" is just `completedAt` today.
  Needs to actually say "cryptographically verified timestamp" once
  true, plus a new row (alongside `Sealed` / `Identity verified`)
  showing which TSA backed it. **Must branch on `timestamp_tsa`** — a
  Sectigo-backed seal needs no caveat, a FreeTSA-fallback one still
  carries the verifiability nuance from the decision above. Same for
  `/api/verify/route.ts`'s response shape (new fields alongside
  `identityVerifiedAt`).
- `/verified-badge/page.tsx`'s "What this actually proves" section —
  the exact sentence this whole investigation started from: "...as of
  a verified timestamp, sealed by an identity-verified person" →
  "cryptographically verified timestamp." FAQ Q1 repeats similar
  language, same update.

**Worth doing in the same pass, not strictly required:**
- A new FAQ entry explaining the Sectigo-primary/FreeTSA-fallback
  design in plain language — matches the page's existing habit of
  spelling out exactly what's proven and what isn't.
- `/privacy` + `/dpa` — per [[feedback-update-legal-pages-with-new-processors]],
  sending a document hash to Sectigo/FreeTSA is a new outbound data
  flow (hash only, not file content) worth a disclosure line, same
  pattern as the Stripe Identity addition.

**Probably unaffected, worth a final check at build time:**
- Console chat's seal confirmation/sealed-result bubble copy
  (`console-chat.ts`/`.tsx`) doesn't make a technical crypto claim
  today.
- The live Reddit ad creatives embed the badge image too, so they'd go
  stale — but that's a live-ad-swap operational step in Reddit Ads
  Manager, not a copy question.
