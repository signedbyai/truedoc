# Document delivery & per-recipient security audit — 2026-07-25

Triggered by a signer report: opening a signing link (`Buzz_Michael_Eagles_Advisory_v3-2`,
8 pages) showed **"Couldn't load this document (8 expected pages)."** with a Try again
button, alongside two questions: could R2 CORS/hotlink settings be the cause, and can two
signed-in users share a document link and bypass per-recipient security. This document
covers both, plus a reproduction test and what established e-signature products do.

## TL;DR

1. **A real, critical bug, confirmed and reproduced**: per-recipient email-OTP verification
   (the "Confirm it's you" code-entry screen) is enforced **only in the page that renders
   the signing UI** — not in any of the underlying API routes that page calls. Anyone who
   has a signer's raw signing-link URL can call those APIs directly and view, summarize,
   sign, or decline the document without ever passing the OTP challenge. This is not about
   two people sharing a link in the abstract — it means the OTP feature currently protects
   nothing at the data layer. See [Finding 1](#finding-1-the-otp-gate-is-ui-only-critical).
2. **CORS/hotlink protection almost certainly isn't the cause of the load failure.**
   SignedBy's signer-facing PDF viewer never talks to R2 from the browser — it fetches
   from SignedBy's own domain, and the server fetches from R2 itself. CORS and Cloudflare's
   hotlink/WAF features don't apply to that path at all. See
   [Finding 2](#finding-2-cors--hotlink-protection-dont-apply-to-this-path).
3. The load failure is more likely caused by an unhandled intermittent R2 read error
   (a known R2 behavior under load), combined with an all-or-nothing full-buffer download
   with zero server-side retry — worth testing on real mobile connections, per your
   carrier-caching question. See [Finding 3](#finding-3-most-likely-real-causes-ranked).

---

## How document delivery actually works today

```
Signer's browser                 SignedBy (Vercel)                    Cloudflare R2
──────────────────                ──────────────────                   ──────────────
GET /sign/{token}      ────────►  page.tsx: getSignerByToken(token)
                                     - checks signing_token exists
                                     - checks auth_required/verified_at
                                     - renders SigningView (React)
                       ◄────────  HTML + the SigningView component

pdfjs-dist fetches
GET /api/sign/{token}/file ────►  route.ts: getSignerByToken(token)
                                     - (no auth_verified_at check)  ──►  GetObjectCommand
                                                                    ◄──  full PDF bytes
                       ◄────────  NextResponse(fullBuffer, {Content-Type: application/pdf})
```

Two things worth being explicit about, since this is the part you're being asked to agree to:

- **The browser never has R2 credentials or an R2 URL.** Every "view/download the PDF"
  action goes through SignedBy's own API (`/api/sign/[token]/file`, `/signed-file`,
  `/api/documents/[id]/file`, etc.), which uses the AWS S3 SDK server-side
  (`src/lib/r2.ts`, account access-key credentials) to fetch the object from
  `{account}.r2.cloudflarestorage.com` and returns the raw bytes as a normal same-origin
  response. This is the "backend proxy" pattern, not the "presigned URL" pattern.
- **The only place the browser talks to R2 directly is uploading a new document**
  (`getSignedUploadUrl` in `r2.ts` → a presigned `PUT`, used by `new-document-client.tsx`
  so large files skip Vercel's 4.5 MB function-body cap). That upload path is the one that
  actually needs R2 bucket CORS rules (`AllowedOrigins`, `AllowedMethods: PUT`,
  `AllowedHeaders: Content-Type`) — and per your memory notes, that was already configured
  when presigned uploads shipped (2026-07-16).

If that's an accurate description of what you intended, that's the part to explicitly sign
off on — everything below is diagnosis built on top of this model being correct.

### Endpoint used, and whether an AWS-compatible endpoint is needed

`src/lib/r2.ts` already uses the AWS SDK v3 (`@aws-sdk/client-s3`,
`@aws-sdk/s3-request-presigner`), pointed at R2's **S3-compatible API endpoint**:
`https://{CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region `"auto"`,
authenticated with an R2 API token's access-key/secret pair (`CLOUDFLARE_R2_ACCESS_KEY_ID`
/ `CLOUDFLARE_R2_SECRET_ACCESS_KEY`). That's exactly the S3-compatible API the Gemini
thread recommended over Cloudflare's REST management API (`api.cloudflare.com`) — this app
was never using the REST API, so there's nothing to migrate. Two distinct operations
against that one endpoint:

- **Write (upload)**: `getSignedUploadUrl()` creates a presigned `PutObjectCommand` URL;
  the browser `PUT`s the file straight to that URL. This is the only browser→R2 call in the
  app.
- **Read (view/download)**: `getFromR2()` runs a plain `GetObjectCommand` **server-side**
  (using the account credentials directly, no presigning), buffers the whole object, and
  the Next.js route hands those bytes back to the browser as its own same-origin response.
  There's no presigned GET anywhere, and no route redirects the browser to an R2 URL.

### CORS settings, extra headers, ETags — what's actually needed

Given the above, **no R2 CORS changes, extra headers, or ETag exposure are needed for
viewing/downloading documents** — that path is 100% same-origin from the browser's
perspective (browser → signedby.ai → [server-side, no CORS applies] → R2), so CORS simply
never enters into it.

The **only** place CORS matters at all is the presigned-`PUT` upload, and the only thing it
needs is: `AllowedOrigins` for `signedby.ai` (and `dev.signedby.ai`), `AllowedMethods:
["PUT"]`, `AllowedHeaders: ["Content-Type"]` — because the presigned URL bakes in a
specific `Content-Type`, and the upload client (`new-document-client.tsx`) sends
`Content-Type: application/pdf` on the `PUT`, which has to match what was signed. I
can't independently re-check the live bucket's CORS policy from here (no Cloudflare
dashboard/API access in this sandbox — this was set via the dashboard, not tracked as
code anywhere in the repo, and the README's Cloudflare section predates this feature and
was never updated). But functionally: a CORS mismatch on a `PUT` fails **every single
upload**, not intermittently — the browser blocks the response before your code ever sees
it, and it would have shown up as "uploads never work," not as an occasional signer-side
load failure. Since presigned uploads have been in production since 2026-07-16 without
that kind of report, that's good indirect evidence CORS is already fine there — just not a
substitute for you checking the actual dashboard rule if you want to be certain.

On `ETag` specifically: some upload flows add `ExposeHeaders: ["ETag"]` so client code can
read the `ETag` off the `PUT` response to verify the upload (common in multipart-upload
tutorials). This app's upload code doesn't do that — `new-document-client.tsx` only checks
`putRes.ok` (the HTTP status) and never reads any response header — so exposing `ETag`
isn't required by anything here. Harmless if it's already set, not worth adding if it isn't.

---

## Finding 1: The OTP gate is UI-only (CRITICAL)

`src/app/sign/[token]/page.tsx` line 138 is the *only* place in the codebase that checks:

```ts
if (signer.auth_required && !signer.auth_verified_at) {
  return <SignerAuthGate token={token} documentTitle={document.title} logo={statusLogo} />;
}
```

Every one of these API routes calls the same `getSignerByToken(token)` helper
(`src/lib/signing.ts`) and then proceeds — none of them re-check `auth_required`/
`auth_verified_at`:

| Route | What it does with only the token, regardless of OTP status |
|---|---|
| `GET /api/sign/[token]` | Returns the signer name/email, document title, and every field this signer can fill |
| `GET /api/sign/[token]/file` | Streams the actual source PDF bytes |
| `GET /api/sign/[token]/signed-file` | Streams the final signed PDF once complete |
| `GET /api/sign/[token]/summary` | Generates/returns the AI "what am I signing" summary |
| `POST /api/sign/[token]/submit` | **Actually signs the document** — saves field values, marks the signer `signed`, can complete the whole document |
| `POST /api/sign/[token]/decline` | Declines on the signer's behalf, ending the document for everyone |
| `GET /api/sign/[token]/status` | Returns signing status |
| `POST /api/sign/[token]/payment-click` | Logs a payment-link click |

`getSignerByToken`'s own comment describes the intended model exactly: *"the signer proves
identity via an unguessable `signing_token`... access control is entirely 'do you know the
token.'"* That's a reasonable model **for recipients who didn't ask for extra
verification**. But for a recipient an org explicitly marked `auth_required` — meaning "make
this person prove their email before they see or sign anything" — the code silently drops
that requirement the moment you skip the page and call the API. In practice: paste a
signing URL's token into curl, `fetch`, or a script, and you get the document, the fields,
and the ability to sign or decline — the OTP screen is simply never in the way.

This also directly answers your "can two signed-in users share a link" question: yes, and
more broadly than that — it doesn't even require two people. **One person with the token
and zero verification can do everything a verified signer can do.** The feature currently
provides an audit-trail artifact (`identity_verified` event) and a UI speed bump, not actual
access control.

**Reproduced with a real test**, not just a code-read: `src/app/api/sign/[token]/auth-gate-bypass.test.ts`
builds a signer fixture with `auth_required: true, auth_verified_at: null` (an org that
turned on verification, for a recipient who hasn't passed it yet) and calls the real route
handlers. Both assertions currently pass — proving the bypass:

```
✓ GET /api/sign/[token]/view returns the document's fields with no auth_verified_at check
✓ GET /api/sign/[token]/file streams the actual PDF bytes with no auth_verified_at check
```
(`npx vitest run`, verified in sandbox — tsc and eslint both clean on the new file.)

**Not fixed yet** — this needs a decision from you, since the fix touches every one of those
8 routes. The shape of the fix: a small shared helper (e.g. `assertSignerVerified(signer)`
in `signing.ts`, or fold the check straight into `getSignerByToken` with a parameter like
`getSignerByToken(token, { requireVerified: true })` for the routes that shouldn't bypass it)
called at the top of every route above except `GET /auth/request` and `POST /auth/verify`
themselves (which have to work *before* verification). Small, mechanical, but touches 8
files — want me to build it now?

---

## Finding 2: CORS / hotlink protection don't apply to this path

Both links you sent point at the same idea: Cloudflare-level protections (bucket CORS rules,
hotlink/Referer protection, WAF) can cause intermittent failures for content served from R2.
That's true in general, and it's exactly what a generic AI answer (I checked the Gemini
thread you linked) would flag for "R2 + intermittent PDF load failure." But it doesn't fit
*this* codebase's actual architecture:

- **CORS is a browser-enforced restriction on cross-origin requests.** The signer's browser
  requests `/api/sign/{token}/file` from `signedby.ai` (or `dev.signedby.ai`) itself — same
  origin as the page it's on. There is no cross-origin request here for the browser to
  block, so a CORS misconfiguration on the R2 bucket cannot affect this call at all. CORS
  only matters for the *one* browser→R2 call in the app: the presigned upload `PUT`.
- **Hotlink protection and Cloudflare's WAF-based mitigations are features of a bucket
  exposed through a public custom domain** (i.e., you'd see `cf-mitigated` /
  `cf-cache-status` response headers, as the Gemini answer correctly describes). SignedBy's
  R2 access is the private S3-compatible API endpoint (`{account}.r2.cloudflarestorage.com`)
  authenticated with account access keys, called server-side — never fronted by a public
  domain, so there's no hotlink/WAF surface for this call to hit.

Worth being direct about this since you asked to audit it "properly": the R2/CORS angle is a
reasonable first guess for any "PDF sometimes fails to load" report in general, but it
doesn't match how this specific app fetches documents. I'd treat it as ruled out rather than
pending.

---

## Finding 3: most likely real causes (ranked)

Given the actual path (`pdfjs-dist` in `signing-view.tsx` → `GET /api/sign/{token}/file` →
`getFromR2()` → `GetObjectCommand` with account credentials → full buffer → one
`NextResponse`):

1. **Most likely — intermittent R2 5xx with zero server-side retry.** `getFromR2()`
   (`src/lib/r2.ts`) makes one `GetObjectCommand` call and throws straight through on any
   failure; `file/route.ts` catches that and returns a flat `500 "Could not load file"` —
   no retry, no backoff. R2 is documented (and this matches what the Gemini thread
   correctly flagged) to return transient 5xx errors under concurrent load. The client
   already has *one* silent auto-retry (`signing-view.tsx`'s `autoRetriedRef`, ~1.2s later),
   but if R2 is having a multi-second blip, both the original attempt and the quick retry
   can land in the same bad window. A 2-3 attempt retry-with-backoff *inside* `getFromR2()`
   would directly address this and is a small, low-risk change.
2. **No range/streaming support — the whole 8-page PDF must arrive in one shot.** The route
   always does `transformToByteArray()` (full buffer) and returns one response; it doesn't
   read or honor a `Range` header, so `pdfjs-dist` can't do partial/progressive loads. On a
   normal broadband connection this is invisible; on a weaker or interrupted connection
   (exactly the scenario your mobile-carrier question raises), a full-file, no-resume
   download has strictly more ways to fail mid-transfer than a range-capable one would.
3. **Your mobile-carrier question is a real, testable hypothesis, not yet a confirmed
   cause** — I want to be precise about that distinction since you flagged it as "just a
   question so far." What's true in general: some mobile carriers run transparent proxies
   that intercept and re-terminate HTTPS (confirmed by published research — see sources),
   which *can* corrupt or truncate binary payloads for some devices/carriers. It's plausible
   here, but I haven't reproduced it, and it would need testing on the actual reporting
   signer's device/carrier to move from "plausible" to "confirmed." One thing already in
   your favor regardless: the routes already set `Cache-Control: private, max-age=60`,
   which correctly tells any shared/carrier cache not to store the response — so carrier
   *caching* specifically is less likely than carrier *interception/mangling*, if it's
   carrier-related at all.
4. **Ruled out**: CORS, hotlink protection, WAF (Finding 2). Also checked and ruled out:
   Vercel's 4.5 MB request-body cap doesn't apply here — that's an *inbound* limit on
   requests hitting a Vercel function, not a limit on how much a function can return, and
   uploads already route around it via the presigned-PUT path.

**What I didn't build yet**: a test that reproduces #1 (simulating an R2 5xx and asserting
the route retries) would be the natural next artifact if you want to move on this — it's a
few lines given the existing mock pattern. Say the word and I'll add it plus the actual
retry logic.

---

## What established e-signature/document platforms do

Quick web research (sources below) confirms the architectural split SignedBy already uses is
the standard security-conscious choice, not an unusual one:

- **Backend-proxy pattern** (what SignedBy does): the backend authenticates/authorizes on
  every request, then fetches the object itself and streams it back — the client never gets
  a URL or credential that outlives that one request's own auth check.
- **Presigned-URL pattern** (what SignedBy does *not* do for viewing): the backend issues a
  time-limited signed URL and lets the client fetch straight from storage. This is simpler
  and cheaper to scale, but every source I checked is explicit that a presigned URL is a
  **bearer artifact** — "anyone who has the URL can perform the action it was signed for
  until the URL expires," independent of who's holding it. That's a worse fit for a
  per-recipient-authenticated signing link than what you already have.

So the *storage/serving* architecture isn't the gap — it's already the more defensible of
the two common patterns. The actual gap (Finding 1) is that the *access-control check*
(OTP verification) sits in the wrong layer: on the page that renders the UI, instead of on
every route that returns real data. That's a code-organization bug, not an architecture
choice, and it's the one worth fixing regardless of which serving pattern is used.

Sources:
- [Securing S3 Objects: Backend Proxy vs Gateway Auth vs Presigned URLs](https://georg-schwarz.com/blog/securing-s3-objects-backend-proxy-gateway-auth-presigned-urls/)
- [Are S3 signed URLs secure? — Advanced Web Machinery](https://advancedweb.hu/are-s3-signed-urls-secure/)
- [S3 Uploads — Proxies vs Presigned URLs vs Presigned POSTs — Zac Charles](https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932)
- [AWS: Overview of presigned URLs](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/overview.html)
- [Investigating Transparent Web Proxies in Cellular Networks (Springer)](https://link.springer.com/chapter/10.1007/978-3-319-15509-8_20)
- [The Security Impact of HTTPS Interception (NDSS '17)](https://jhalderm.com/pub/papers/interception-ndss17.pdf)

---

## Summary / decisions — resolved 2026-07-25

1. **Fix the OTP bypass (Finding 1) — DONE.** `requireVerifiedSigner()` added to
   `src/lib/signing.ts`, called right after `getSignerByToken()` in all 9 affected routes
   (view, file, signed-file, summary, submit, decline, status, payment-click, page-view
   beacon). `auth-gate-bypass.test.ts` flipped from documenting the bug to a regression test:
   an unverified signer now gets 401 on view/file/submit/decline; a verified signer still
   gets normal 200 access. tsc/eslint clean, full suite 442/442. Commit `2bc7d8a` on master,
   not yet pushed.
2. **Add server-side retry-with-backoff to `getFromR2()` (Finding 3, #1) — DONE.** Up to 3
   attempts, 200ms base delay doubling, skips retrying a genuine NoSuchKey/NotFound. New
   `r2.test.ts` covers the healthy path, one-transient-failure recovery, exhausting retries,
   and not retrying a real missing object. tsc/eslint clean, full suite 446/446. Commit
   `10e5803` on master, not yet pushed.
3. **CORS/hotlink**: nothing to do — ruled out for this path, no action needed.
4. **Mobile-carrier theory**: still needs real-device testing to confirm or rule out, not a
   code change on its own.
