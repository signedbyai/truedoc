// Which signer a stored field belongs to, pulled out of generateSignedPdf so
// it's unit-testable without Supabase, R2 or pdf-lib — the same reasoning that
// produced field-visibility.ts and the exported stampFields.
//
// This is the most dangerous logic in the app to get wrong. Three separate
// CRITICAL bugs have come from field-to-signer attribution, all with the same
// shape: a field ends up attributed to nobody or to the wrong party, the
// document still sends and still completes, and the failure is invisible until
// someone opens a signed PDF and finds an empty box.
//
// SCOPE NOTE: this covers the SERVER side only. The client's equivalent rule
// (claiming template-seeded fields when a recipient is added) is still inline
// in field-editor.tsx and deliberately so — calling an imported helper on that
// component's state trips react-hooks/preserve-manual-memoization, which makes
// the React Compiler skip optimizing the whole editor. Extracting it was tried
// on 2026-08-16 and reverted for that reason. If the compiler settings ever
// change, that rule belongs here next to this one.

/** Field shape as the DATABASE holds it — snake_case. */
export type OwnedField = {
  type: string;
  signer_id: string | null;
  template_role: number | null;
};

/**
 * Which signer a stored field should be attributed to when reporting on it,
 * or null when it can't be attributed safely — callers must skip rather than
 * guess.
 *
 * Mirrors visibleFieldsForSigner (lib/field-visibility.ts): an unassigned
 * field belongs to the sole signer, but ONLY when it was never tagged for a
 * specific party. A field still carrying a template_role was meant for someone
 * who never got added, so attributing it to whoever happens to be the only
 * signer would report one person as having filled a field whose whole purpose
 * was to distinguish two.
 *
 * The single-recipient case is not an edge case: senders routinely place
 * fields without ever clicking the recipient chip, so signer_id is null on a
 * large share of real documents. The first version of the certificate's
 * signing-method summary checked signer_id alone and therefore reported
 * nothing on exactly those — the commonest kind of document there is.
 */
export function ownerOfField(field: OwnedField, signerIds: string[]): string | null {
  if (field.signer_id) return field.signer_id;
  if (field.template_role !== null) return null;
  return signerIds.length === 1 ? signerIds[0] : null;
}
