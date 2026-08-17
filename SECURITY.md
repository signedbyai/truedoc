# Security policy

## Why this file exists

This tool's entire output is a trust judgement. The worst realistic bug is
not a crash — it is a file that **should** fail and instead reports
"Unaltered". If you find one of those, please tell us privately first.

## Reporting

Email **security@signedby.ai** with enough to reproduce: the PDF if you can
share it, or the smallest synthetic file that shows the behaviour.

We will acknowledge within 3 working days and aim to have a fix or a
written explanation within 14. We will credit you in the release notes
unless you would rather we did not.

Please do not open a public issue for anything in the first two categories
below until a fix is out.

## What we consider a vulnerability here

**High — report privately:**

- A tampered or mismatched document reported as `verified`.
- A signature that fails cryptographically but is reported as valid.
- An unpinned or untrusted root reported as `anchored`.
- Any path where the page makes a network request. The Content-Security-
  Policy (`default-src 'none'`) is meant to make this impossible in the
  browser; a way around it is a genuine finding.
- Anything that causes the page to disclose the document's contents.

**Also worth reporting:**

- A valid document reported as `mismatch` or `unverified` — a false
  rejection. These are treated as real bugs, not cosmetic ones: a verifier
  that cries wolf on genuine documents is worse than no verifier.
- A signature format that produces a hard error rather than a clean
  "this page cannot read that format" result.

**Not vulnerabilities:**

- "Authority unrecognised" on a document from an authority we do not pin.
  That is the designed behaviour — the pinned-root list is deliberately
  tiny so that a human can check it. It means *confirm the authority
  yourself*, not *this document is bad*.
- Revocation not being checked. That needs network access, which this tool
  does not have by design. It is stated in the interface.
- The tool declining to tell you *who* signed something. A document
  timestamp records when, never who. That boundary is deliberate.

## Scope

This repository and whatever is served at https://truedoc.eu.

If you are reporting something about SignedBy itself rather than this
verifier, use the same address and say so.
