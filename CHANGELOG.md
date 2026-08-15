# Changelog

**Why this file matters more than usual here.** The page served at
verifiedby.dev can be hash-checked against this repository. That check is
only useful if a *change* in the hash can be explained — an unexplained
change is indistinguishable from tampering. So every release records the
build stamp shown in the page footer and the SHA-256 of the deployed file.

If the hash you observe is not listed below, something is wrong. Please say
so: security@signedby.ai.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

Nothing yet.

## 2026-08-15

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
