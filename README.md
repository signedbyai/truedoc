# VerifiedBy

[![verify](https://github.com/signedbyai/verifiedby/actions/workflows/verify.yml/badge.svg)](https://github.com/signedbyai/verifiedby/actions/workflows/verify.yml)
[![licence](https://img.shields.io/badge/licence-Apache--2.0-blue)](LICENSE)

An independent, offline verifier for signed and timestamped PDFs.

**[verifiedby.dev](https://verifiedby.dev)** — drop a PDF in. It runs
entirely in your browser. The file is never uploaded, and the page makes no
network requests at all.

One HTML file, zero dependencies, ~53 KB. Save it with `⌘S` and it keeps
working with no internet and nobody's servers, including ours.

---

## What it proves

- The file is **byte-for-byte identical** to what was signed or
  timestamped. Change one byte and it fails.
- The signature over that fact is cryptographically valid, and its
  certificate chain is intact.
- When it happened — and whether that time is **proven by a timestamp
  authority** or merely **claimed by the signer's own software**. Most
  tools blur those together. This one does not.
- **How long the proof lasts.** Every certificate expires, so every
  document has a date after which its validity can no longer be
  demonstrated from the file alone. The page tells you that date. It is
  usually sooner than people expect.

## What it does not prove

- **Who.** A document timestamp records *when*, never *who* — it carries no
  signer identity at all. An ordinary signature proves which *certificate*
  was used, which is a fact about a key, not a verified fact about a
  person.
- That the document is honest, that the sender is who they claim, or that
  the bank details on it are right. Confirm those the way you always would.
- Certificate revocation, which needs network access this tool
  deliberately does not have.

A verifier that overclaims is worse than none, so these limits are stated
in the interface, not only here.

## How it decides

Every check, in order, what each verdict means, and what would have to be
true for each to be wrong: **[METHODOLOGY.md](METHODOLOGY.md)**.

The rubric is published because that is what makes a verdict arguable. If
the document and the code disagree, the document is the bug.

## "Authority unrecognised" is not a failure

This tool pins a deliberately tiny list of trust anchors, so that the list
stays short enough for a human to check by hand. Most documents from
elsewhere therefore report `verified-untrusted-root`. That means *the
cryptography is sound, now go confirm the authority yourself* — not *this
document is bad*.

Roots are pinned **by public key** (SubjectPublicKeyInfo SHA-256), not by
certificate fingerprint. Roots get cross-signed, so one key legitimately
has several certificates with different fingerprints; pinning the
certificate would reject a good document for no reason.

---

## Check that you are running what we published

Open-sourcing a hosted tool proves nothing on its own, because nothing
forces the bytes served to match the source published. So verify it:

```bash
# what is actually being served
curl -s https://verifiedby.dev | shasum -a 256

# what this repository builds
node build.mjs && shasum -a 256 index.html
```

Those two must match. When the hash changes, [CHANGELOG.md](CHANGELOG.md)
records why — an unexplained hash change is indistinguishable from
tampering, so every release lists its build stamp and deployed digest.

`index.html` is generated deterministically from
`verify-core.mjs` and `shell.html` by `build.mjs`, which only inlines one
into the other — so anyone can reproduce it and confirm the page they are
running is the code they just read.

Together with the Content-Security-Policy the site serves
(`default-src 'none'`, so the browser itself refuses every network
request), that is the whole trust story: the page cannot phone home, and
the page you get is the page that was published.

## Build

```bash
node build.mjs      # verify-core.mjs + shell.html -> index.html
```

No toolchain, no dependencies, no install step.

**Never add analytics, web fonts or CDN links.** "No network requests" is a
claim a technical reader will check in devtools, and one script tag
destroys it. The CSP would break the page loudly if you tried, which is
deliberate.

## Test

```bash
node test/verify-fixtures.mjs
```

The fixture PDFs are not in the repository — some are real sealed documents
and one is another company's export, so the set is not ours to
redistribute. `test/README.md` explains how to build an equivalent set,
including the one-byte-flip control that everything else rests on.

## Files

| File | |
|---|---|
| `verify-core.mjs` | The verifier: a minimal DER walker plus WebCrypto |
| `shell.html` | Interface and copy, with a `/*__CORE__*/` placeholder |
| `build.mjs` | Inlines the core into the shell |
| `index.html` | **Generated.** The single deployable file |
| `test/` | Fixture harness and expected results |

## Supported

RFC 3161 document timestamps (`/ETSI.RFC3161`), ordinary detached
signatures (`/adbe.pkcs7.detached`, `/ETSI.CAdES.detached`), CAdES-T
signature timestamps carried as unsigned attributes, Adobe
revocation-info-archival, PAdES-LTA files with multiple timestamps, RSA and
ECDSA (P-256/384/521).

Anything else reports "this page cannot read that format" — a limit of the
tool, stated as such, never dressed up as a finding about your document.

## Security

Found a file that should fail and reports *Unaltered*? Please report it
privately first: **security@signedby.ai**. See [SECURITY.md](SECURITY.md).

False rejections — a valid document reported as broken — are treated as
real bugs too, not cosmetic ones.

## Who made this

Built and operated by **SPRK10 B.V.**, the company behind
[SignedBy](https://signedby.ai).

We say so plainly rather than leaving it to be discovered. A verifier that
looks independent while quietly belonging to a vendor is worth less than
one that admits whose it is — because the point was never that you should
trust us. It is that you do not have to: the tool runs on your machine,
talks to nothing, and the entire implementation is in front of you.

## Licence

[Apache-2.0](LICENSE). The name "VerifiedBy" and the SignedBy name are
trademarks and are not licensed with the code (Apache-2.0 §6) — fork it
freely, but ship it under your own name, so a reader can always tell whose
verifier they are running.
