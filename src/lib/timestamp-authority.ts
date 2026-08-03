import { timestampPdf, extractTimestamps, KNOWN_TSA_URLS } from "pdf-rfc3161";

// RFC 3161 trusted timestamping (TIMESTAMP_AUTHORITY_SCOPE.md, built
// 2026-08-03). A Time Stamping Authority cryptographically signs a
// document's hash together with the time — anyone can verify that
// signature later trusting only the TSA, not SignedBy's own database.
//
// Decided (TIMESTAMP_AUTHORITY_SCOPE.md): Sectigo's free public TSA as
// primary, FreeTSA.org as an automatic runtime fallback, not a manual
// switch. Sectigo (and DigiCert, an equally valid swap if Sectigo ever
// proves unreliable) chains to an already-trusted root, so the common case
// needs no manual trust-store step to independently verify — unlike
// FreeTSA's self-signed CA, which is why FreeTSA is the fallback and not
// the primary: Verified Badge's whole pitch is "no account needed to check
// it," and a timestamp that requires installing a root certificate first
// undercuts that same honesty standard. Both are currently free with no
// published SLA — a real paid/contracted TSA relationship is a future
// revisit trigger if volume or a customer ever makes that worth doing, not
// a v1 requirement.
export type TimestampTsa = "sectigo" | "freetsa";

export type TimestampSuccess = {
  /** The PDF bytes with the RFC 3161 DocTimeStamp signature embedded —
   *  upload THESE bytes, not the ones passed in. */
  pdf: Uint8Array;
  tsa: TimestampTsa;
  /** The TSA's own attested time for this token — not when this ran locally. */
  genTime: Date;
  /** Raw DER-encoded timestamp token, extracted back out of the signed PDF
   *  so it can be persisted alongside the document without needing to
   *  re-fetch/re-parse the whole PDF later. */
  token: Uint8Array;
};

const SECTIGO_TSA_URL: string = KNOWN_TSA_URLS.SECTIGO;
const FREETSA_URL: string = KNOWN_TSA_URLS.FREETSA;

async function tryTsa(pdfBytes: Uint8Array, url: string, tsa: TimestampTsa): Promise<TimestampSuccess> {
  const result = await timestampPdf({ pdf: pdfBytes, tsa: { url }, enableLTV: true });

  // pdf-rfc3161's TimestampResult only returns the embedded PDF + parsed
  // metadata (genTime, policy, serial number, ...), not the raw DER token
  // bytes directly — extractTimestamps() reads it back out of the PDF we
  // just got, which is also a cheap sanity check that the embed actually
  // produced something extractable rather than trusting it silently.
  const extracted = await extractTimestamps(result.pdf);
  const last = extracted[extracted.length - 1];
  if (!last) throw new Error(`${tsa} timestamp reported success but no token could be extracted back out of the PDF`);

  return { pdf: result.pdf, tsa, genTime: last.info.genTime, token: last.token };
}

// Non-blocking by construction — NEVER throws. Same philosophy already
// established for badge generation (generate-signed-pdf.ts's own comment:
// "Never lets badge generation failure... block a signed PDF from
// finishing"). A TSA being unreachable, rate-limiting a burst of requests
// (Sectigo's public endpoint asks for 15s+ between scripted requests —
// relevant for bulk-send bursts), or returning a malformed response
// shouldn't stop a document from sealing; it just falls back to today's
// honest database-only timestamp claim. Both attempts are logged with the
// real error (including pdf-rfc3161's typed TimestampErrorCode when
// present) so a persistent problem is visible in logs without needing this
// function's control flow to branch on it.
export async function timestampWithFallback(pdfBytes: Uint8Array): Promise<TimestampSuccess | null> {
  try {
    return await tryTsa(pdfBytes, SECTIGO_TSA_URL, "sectigo");
  } catch (err) {
    console.error("RFC 3161 timestamp: Sectigo failed, trying FreeTSA fallback", err);
  }

  try {
    return await tryTsa(pdfBytes, FREETSA_URL, "freetsa");
  } catch (err) {
    console.error("RFC 3161 timestamp: FreeTSA fallback also failed — sealing without a real TSA timestamp", err);
    return null;
  }
}
