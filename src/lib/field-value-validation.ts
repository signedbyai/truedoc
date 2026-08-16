// Server-side validation of a signer-submitted field value against the field
// type the SENDER chose (SIGNATURE_FIELD_VALIDATION_SCOPE.md, layer 1).
//
// Why this exists: until 2026-08-16 the submit route's body schema was
// `values: z.record(z.string().uuid(), z.string())` — any string for any
// field type — and the route never consulted a field's type at all. The only
// check was that required fields were non-empty. So a direct POST could write
// "asdf" into a date field or "x" into a signature field, and it was persisted
// verbatim. The native <input type="date"> in the signing view is a client
// convenience, not a constraint; nothing behind it enforced anything.
//
// Reported externally as "the signature field accepts anything — what's the
// point of all the different signing options?", which is the right question:
// offering four signing affordances that all resolve to an unvalidated string
// means the type a sender picked carries no guarantee, and SignedBy's whole
// proposition is that the sealed artifact carries a real evidentiary claim.
//
// Note the asymmetry this closes: field DEFINITIONS were always properly typed
// (see api/documents/[id]/fields/schema.ts — z.enum, bounded numbers). Only
// field VALUES were unchecked.
//
// Deliberately dependency-free and side-effect-free so it can be unit-tested
// directly and reused from any runtime (no Buffer, no Node built-ins) — same
// reasoning as stampFields being exported from generate-signed-pdf.ts.

export type FieldValueType = "signature" | "initials" | "date" | "text" | "checkbox";

/** Max characters in a free-text field. Text fields were unbounded end-to-end;
 *  pdf-lib's drawText will happily render a 10,000-character string off the
 *  edge of the page. Generous enough for any real answer (an address, a job
 *  title, a reference number) — this is an abuse bound, not a UX one. */
export const MAX_TEXT_LENGTH = 500;

/** Max decoded bytes of a signature/initials image. A drawn signature from the
 *  pad is a few KB; a typed one is smaller still. 1.5MB leaves enormous
 *  headroom for a high-DPI drawn signature while refusing anything that's
 *  really a file upload in disguise. */
export const MAX_SIGNATURE_BYTES = 1_500_000;

// Anchored, and the base64 body is charset-constrained, so this doubles as a
// cheap sanity check on the payload before any decoding arithmetic.
const SIGNATURE_DATA_URL = /^data:image\/(?:png|jpeg|jpg);base64,([A-Za-z0-9+/]+={0,2})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Decoded byte length of a base64 string, computed arithmetically rather than
 *  by decoding — avoids pulling in Buffer/atob (runtime portability) and avoids
 *  materialising a megabyte of image data just to measure it. */
function base64ByteLength(b64: string): number | null {
  if (b64.length % 4 !== 0) return null; // truncated / malformed
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length / 4) * 3 - padding;
}

/** True only for a date that actually exists — catches 2026-02-31, which
 *  matches ISO_DATE and which `new Date()` silently rolls forward to March. */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Returns null when `value` is acceptable for `type`, or a short human-readable
 * reason why it isn't (phrased to complete the sentence "That date field ...").
 *
 * An EMPTY value is always acceptable here: whether a field is allowed to be
 * empty is the required-field check's job, and that check already runs in the
 * submit route. Keeping the two separate means an optional field left blank
 * doesn't have to be special-cased in every branch below.
 */
export function validateFieldValue(type: FieldValueType, rawValue: string): string | null {
  const value = rawValue.trim();
  if (value === "") return null;

  switch (type) {
    case "signature":
    case "initials": {
      const match = SIGNATURE_DATA_URL.exec(value);
      // The stakes here are the whole point of the scope doc: a signature
      // value that isn't an image is silently SKIPPED at stamp time
      // (generate-signed-pdf.ts), so the document still completes, still
      // hashes, still gets a certificate — with an empty box where the
      // signature should be. Refusing it at the door is the fix.
      if (!match) return "must be a PNG or JPEG image";
      const bytes = base64ByteLength(match[1]);
      if (bytes === null || bytes === 0) return "image data could not be decoded";
      if (bytes > MAX_SIGNATURE_BYTES) return "image is too large";
      return null;
    }
    case "date": {
      const match = ISO_DATE.exec(value);
      if (!match) return "must be a date in YYYY-MM-DD format";
      if (!isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
        return "is not a real calendar date";
      }
      return null;
    }
    case "checkbox":
      // stampFields draws the tick only for exactly "true"; anything else
      // would store a value that renders as nothing.
      return value === "true" ? null : 'must be "true" or empty';
    case "text":
      return value.length > MAX_TEXT_LENGTH
        ? `must be ${MAX_TEXT_LENGTH} characters or fewer`
        : null;
  }
}
