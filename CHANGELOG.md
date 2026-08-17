# Changelog

**Why this file matters more than usual here.** The page served at
truedoc.eu can be hash-checked against this repository. That check is
only useful if a *change* in the hash can be explained — an unexplained
change is indistinguishable from tampering. So every release records the
build stamp shown in the page footer and the SHA-256 of the deployed file.

If the hash you observe is not listed below, something is wrong. Please say
so: security@signedby.ai.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed

- Rebranded from VerifiedBy/verifiedby.dev to TrueDOC/truedoc.eu. No
  behaviour, checks, or verdicts changed — this is the domain, page title,
  repository name, and trademark references only. The build stamp changes
  as a result, which is why it is recorded here rather than left
  unexplained.

## 2026-08-15 (second release)

Build stamp `bf3853076aff` · deployed SHA-256 `c6986f7822539285e6c142e9ce718a5d296fa397f6fb94b3e925acf90df1f454`

### Added

- Open Graph and Twitter card metadata, so a shared link renders a preview
  instead of a bare URL. Safe under the Content-Security-Policy: these are
  read by the sharing platform's crawler, never fetched by a visitor's
  browser.
- Screen-reader text on each verdict row ("Yes:", "No:", "Not present:").
  The marks are CSS `:before` content, which assistive technology routinely
  skips — so the page's actual conclusions were not reaching a non-sighted
  reader at all. The results region is now an `aria-live` status region too.

### Changed

- The two interpretation paragraphs and the note on unrecognised
  authorities now sit behind a "How to read the result" disclosure. Nothing
  was cut; the footer had grown to five dense paragraphs before the source
  block.

### Not done, deliberately

- **No favicon.** Verified: a favicon is refused under `default-src 'none'`
  because `img-src` inherits it, including `data:` URIs. Allowing one means
  `img-src 'self'` or `data:`, which reopens
  `new Image().src = "/leak?" + secret` as an exfiltration channel — the
  precise thing this policy exists to close. The cost is a blank tab icon.

## 2026-08-15 (first release)

Build stamp `4735d778a472` · deployed SHA-256 `6f07dd607a0a1fe623c2c77e477dd45cee0e1256a94aab802b8a9b9b0851a468`

### Fixed

- **Long digests widened the whole page.** The stylesheet targeted
  `td.mono`, but the results table emits the digest inside
  `<td><span class="mono">`, so `word-break` silently stopped applying. A
  128-character SHA-512 digest then became a single unbreakable token and
  forced horizontal scrolling at every viewport width. Now matches `.mono`
  anywhere, with `table-layout:fixed` as a backstop. Verified at
  320/390/768/1024/1280px.
- **Valid documents showed red crosses.** The result checklist marked five
  rows pass/fail, so an ordinary third-party document — no document-level
  timestamp, unpinned root, issuer certificate not embedded — displayed
  three red ✕ while the banner called it valid, and while the footer said
  in as many words that an unrecognised authority is not a failure. Only
  the digest row is genuinely pass/fail; the rest are properties and now
  show a neutral dash.

### Added

- Source, licence and build identifier in the page footer, with the
  commands to verify both the served bytes and the build stamp.
- A three-step statement of what happens to your file, directly beneath the
  drop zone, and a plainer reassurance inside the drop zone itself.
- Where the page is served from, and that access logging is off.
- The operator's legal entity and jurisdiction, so the claim is checkable
  rather than merely stated.
- `METHODOLOGY.md` — what is checked, in what order, what each verdict
  means, and what would have to be true for each to be wrong.
- A CI workflow asserting that `index.html` is reproducible from source and
  that the live site serves exactly those bytes.

### Changed

- The build identifier is the SHA-256 of the two source files, not a git
  commit. A commit SHA cannot work: `index.html` is committed alongside the
  sources that produce it, so any SHA baked into it necessarily names the
  *previous* commit.

## 2026-08-14 — initial public release

First public version. Apache-2.0.

Supports RFC 3161 document timestamps, detached CAdES/PKCS#7 signatures,
CAdES-T signature timestamps, Adobe revocation-info-archival, PAdES-LTA
files with multiple timestamps, and RSA plus ECDSA P-256/384/521.

Runs entirely in the browser, makes no network requests, and is served
under a Content-Security-Policy (`default-src 'none'`) that prevents it
from making any.
