# How this verifier decides

The credibility of a verdict rests on the rubric being public, not on the
verdict looking confident. This is that rubric: what is checked, in what
order, what each result means, and — the part that matters most — what
would have to be true for each result to be **wrong**.

If you find a case where this document and the code disagree, the document
is the bug. Please report it.

---

## 1. Finding the signatures

The PDF is scanned for **every** `/ByteRange` array rather than parsed as
an object graph. The byte offsets are what matter cryptographically, and a
full PDF parser would be far more code and far more to get wrong.

Each signature dictionary yields: the signed byte ranges, the `/Contents`
token, `/SubFilter`, `/Type`, and any claimed time (`/M`).

Results are ordered so the **outermost** signature — the one covering most
of the file — comes last. That one speaks for the document as it stands
now. Earlier ones covered earlier states of it.

> **Why this matters:** an archive-timestamped (PAdES-LTA) document carries
> two or more timestamps. Reading only the first reports a stale time and
> the wrong authority, and makes the *newest* proof invisible.

## 2. Classifying each signature

| `/SubFilter` | Treated as | Where the document digest lives |
|---|---|---|
| `ETSI.RFC3161` | document timestamp | inside the TSTInfo `messageImprint` |
| `adbe.pkcs7.detached` | digital signature | the `messageDigest` **signed attribute** |
| `ETSI.CAdES.detached` | digital signature | the `messageDigest` **signed attribute** |
| anything else | **unsupported** | — |

Unsupported is reported as a limit of this tool, never as a finding about
the document.

## 3. Per-signature checks

1. **Does the digest describe this file?** Hash the signed byte ranges and
   compare — against the TSTInfo imprint for a timestamp, or against the
   `messageDigest` attribute for a signature.
2. **Is the signature authentic?** Verify the signer's signature over the
   DER-encoded `SignedAttrs`, using the public key read from the
   certificate's `SubjectPublicKeyInfo` (not guessed from the signature
   algorithm — the two can disagree). RSA and ECDSA P-256/384/521.
3. **Do the attributes commit to the right thing?** The `messageDigest`
   attribute must equal the hash of the expected content, or the signature
   is over attributes unrelated to this document.
4. **Is the chain intact?** Each embedded certificate must verify against
   its issuer, as far as the embedded certificates allow.
5. **Is the root one we pin?** See §5.
6. **Was the certificate valid at the time claimed or proven?**
7. **Is there a signature timestamp?** For ordinary signatures, a CAdES-T
   token in the *unsigned* attributes is parsed and verified, including
   that its imprint actually covers this signature's value. A valid one
   upgrades the reported time from *claimed* to *proven*.

## 4. Verdicts

Evaluated in this order; the first that applies wins.

| Verdict | Means | Shown as |
|---|---|---|
| `mismatch` | A digest does not match the file | **red** |
| `unverified` | A signature is present but did not check out | **red** |
| `signed-untimed` | Valid signature, but nothing proves *when* | amber |
| `verified-untrusted-root` | Everything checks out; the root is not one we pin | amber |
| `verified` | Everything checks out and the root is pinned | green |
| `no-signature` | Nothing to check | amber |
| `unsupported` | Signed in a format this tool cannot read | amber |

Only `mismatch` and `unverified` are failures of the document. The others
are statements about what the document contains, or about the limits of
this tool.

### The checklist is not five pass/fail tests

Exactly one row — *File matches the digest that was signed* — is pass/fail
and can show ✕. The rest are **properties**: most documents legitimately
carry no document-level timestamp, come from a root we do not pin, or omit
the issuer certificate. Those show a neutral dash when absent. Marking them
red made valid documents look broken.

## 5. Trust anchors

Roots are pinned **by public key** (SHA-256 of the `SubjectPublicKeyInfo`),
not by certificate fingerprint. Roots are routinely cross-signed, so one
key legitimately has several certificates with different fingerprints;
pinning the certificate would reject a good document for no reason.

The list is deliberately tiny so a human can check it by hand. The
consequence is that **most documents from elsewhere report
`verified-untrusted-root`**, which means *the cryptography is sound, now
confirm the authority yourself* — not *this document is bad*.

## 6. "Provable until"

For each element carrying a **proven** time, we take the expiry of the
certificate that signed that time; the latest such date is reported.

A signing certificate expiring sooner does **not** shorten it, because the
timestamp is what proves the signature predated its own expiry.

This date is finite for every document we have yet seen. Extending it means
re-timestamping the file before then, repeatedly — a single archive
timestamp does not help, because the archiving authority's own certificate
expires too.

## 7. What is deliberately not checked

- **Revocation.** Requires network access, which would break the
  no-requests guarantee. For a timestamp it matters less: the signature
  proves the certificate was in use at the stated time.
- **Who signed.** A document timestamp carries no signer identity at all.
  An ordinary signature proves which *certificate* was used — a fact about
  a key, not a verified fact about a person.
- **Whether the document is honest.** Nothing here speaks to the truth of
  the contents, the identity of the sender, or the correctness of any bank
  details on it.

## 8. What would have to be true for a verdict to be wrong

Stated plainly, because a rubric that only lists strengths is marketing.

- **A false `verified`** would require either a break in the signature
  algorithm or a hash collision on the signed range, **or** a bug in this
  tool's DER parsing that caused it to verify a signature over bytes other
  than the ones displayed. The second is far likelier than the first, and
  is why the source is published and the served bytes are hash-checked.
- **A false `mismatch`** most often is not our error at all: re-saving a
  PDF through a mail gateway, a viewer, or a "print to PDF" changes the
  bytes without changing what a human sees.
- **A misleading `verified-untrusted-root`** happens by design whenever an
  authority is legitimate but unpinned. It is a limitation of the pinned
  list, not evidence about the document.
- **A wrong "provable until"** would follow from misreading a certificate's
  `notAfter`, or from a document whose newest proof this tool failed to
  find — which is precisely the bug that existed before multi-signature
  support was added.

## 9. Checking the tool itself

```bash
curl -s https://truedoc.eu | shasum -a 256               # what is served
cat verify-core.mjs shell.html | shasum -a 256 | cut -c1-12   # the build stamp on the page
node build.mjs && shasum -a 256 index.html              # what this repo builds
```

The first and third must match. The second must equal the build identifier
printed in the page footer.
