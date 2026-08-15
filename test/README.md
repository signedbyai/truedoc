# Fixtures

The PDFs are deliberately **not** in this repository. Some are real sealed
documents and one is another company's export, so the set as a whole is not
ours to redistribute. Everything needed to rebuild an equivalent set is
here.

Drop PDFs into `fixtures/`, add an entry to `expected.json`, and run:

```bash
node test/verify-fixtures.mjs
```

## Making your own

**A passing case.** Any PDF carrying an RFC 3161 document timestamp. Seal a
throwaway document with any service that applies one, or timestamp a PDF
yourself against a public TSA.

**The control — build this one first.** Copy a passing fixture, flip a
single byte somewhere in the signed range, and expect `mismatch`:

```bash
cp fixtures/yours.pdf fixtures/tampered.pdf
printf '\x01' | dd of=fixtures/tampered.pdf bs=1 seek=5000 count=1 conv=notrunc
```

If that ever reports `verified`, stop and fix it before anything else. It
is the single check the whole tool rests on.

**An ordinary signed PDF.** Anything signed by Adobe Acrobat, DocuSign or
similar — `/adbe.pkcs7.detached` rather than a document timestamp. Expect
`verified-untrusted-root` unless its root happens to be pinned.

**An archive-timestamped file.** A PAdES-LTA document, i.e. one carrying
two or more timestamps. Expect the *outer* one to be reported.

## What "untrusted root" means here

`verified-untrusted-root` is a **pass**, not a failure. This tool pins a
deliberately short list of roots so a person can check the list by hand, so
most documents from elsewhere land here. It means the cryptography is
sound and you should confirm the authority yourself.
