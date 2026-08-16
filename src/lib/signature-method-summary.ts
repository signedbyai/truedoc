// Turns per-field signing methods into the one phrase the certificate of
// completion prints per signer (SIGNATURE_FIELD_VALIDATION_SCOPE.md layer 3).
//
// Pulled out of generateSignedPdf so it can be tested without Supabase, R2 or
// pdf-lib — same reasoning as stampFields being exported from that file.
//
// The claim this produces is a statement about METHOD only. It must never be
// phrased so as to imply anything about the signer's identity or about the
// signature's legal weight under ESIGN/UETA/eIDAS.

import { ownerOfField, type OwnedField } from "@/lib/signer-field-claim";

export type MethodField = OwnedField & {
  /** 'typed' | 'drawn' | null. Null for every field signed before migration
   *  0057 — never captured, and not back-fillable. */
  signature_method: string | null;
};

/** Only a mark carries a method; a date or text field never does. */
const MARK_TYPES = new Set(["signature", "initials"]);

function phraseFor(method: string): string | null {
  if (method === "typed") return "typing";
  if (method === "drawn") return "drawing";
  return null;
}

/**
 * signer id -> display phrase ("typing", "drawing", or "drawing and typing").
 *
 * A signer normally uses one method for every mark, since later fields reuse
 * the first value — but they can redo one, so both are reported rather than
 * picking a winner.
 *
 * Signers with no recorded method are ABSENT from the map, not present with an
 * empty value: the certificate omits the line entirely in that case, so that
 * silence reads as "not recorded" rather than as a claim about how they
 * signed. Every document predating migration 0057 lands here.
 */
export function signatureMethodBySigner(
  fields: MethodField[],
  signerIds: string[]
): Map<string, string> {
  const methods = new Map<string, Set<string>>();

  for (const field of fields) {
    if (!MARK_TYPES.has(field.type)) continue;
    if (!field.signature_method) continue;
    const phrase = phraseFor(field.signature_method);
    // An unrecognised value is skipped rather than printed — the DB constraint
    // should prevent it, but the certificate is the wrong place to find out.
    if (!phrase) continue;
    const owner = ownerOfField(field, signerIds);
    if (!owner) continue;
    const existing = methods.get(owner) ?? new Set<string>();
    existing.add(phrase);
    methods.set(owner, existing);
  }

  // Sorted so the phrase is stable regardless of field order — a certificate
  // that reads differently for the same document depending on row ordering
  // would be a rotten thing to have to explain.
  return new Map(
    Array.from(methods, ([signerId, phrases]) => [signerId, Array.from(phrases).sort().join(" and ")])
  );
}
