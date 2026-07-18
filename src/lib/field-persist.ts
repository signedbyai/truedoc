// Remap each field's signer id to the recipient's freshly-saved id before
// persisting. The signers endpoint deletes + re-inserts rows on every save, so
// their ids change; without applying that old->new mapping to the fields
// payload, saved fields kept stale ids that matched no recipient and got
// nulled — multi-recipient documents then went out with every field assigned
// to nobody, and each signer saw an empty document. (Single-recipient docs
// hid the bug via the "unassigned field -> sole signer" fallback.)
//
// Pure + unit tested; field-editor.tsx's persist() calls this for the payload.
export function remapFieldSignerIds<T extends { signerId: string | null }>(
  fields: T[],
  oldToNew: Map<string, string>,
  validRecipientIds: Set<string>
): T[] {
  return fields.map((f) => {
    const mapped = f.signerId ? oldToNew.get(f.signerId) ?? f.signerId : null;
    const signerId = mapped && validRecipientIds.has(mapped) ? mapped : null;
    return { ...f, signerId };
  });
}
