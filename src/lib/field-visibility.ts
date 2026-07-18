// Shared "which document_fields does this signer get to see/fill" rule,
// used by both GET /api/sign/[token] (what renders) and
// POST /api/sign/[token]/submit (what's validated/saved) — extracted so the
// two can never drift apart, and so the rule is unit-testable without
// spinning up either route's Supabase calls.

export type VisibilityField = {
  id: string;
  signer_id: string | null;
  // Set only while a field is waiting to be claimed by a specific
  // recipient slot (an AI-suggested or template field tagged "Party 2",
  // etc. — see field-editor.tsx's Field.templateRole). Meaningless once
  // signer_id is set, but while signer_id is still null it means this
  // field was never actually meant to be generic/unassigned — it's
  // missing its intended recipient, not up for grabs by whoever's signing.
  template_role: number | null;
};

// A field is visible/fillable by a signer if it's explicitly assigned to
// them, OR — only when it was never tagged as waiting for a specific
// party — it's unassigned and this signer is the document's only
// recipient (the common case of a sender placing fields without ever
// selecting a recipient chip on a single-signer document).
//
// Deliberately does NOT fall back to the sole signer when template_role is
// set: that means a suggestion/template field meant for a *different*
// party never got a real recipient (e.g. the sender only added one
// recipient to a two-party AI-suggested document). Showing it to the one
// signer anyway would let one person fill in a field meant to distinguish
// two separate parties — in practice, the same signature getting stamped
// into both "Party A" and "Party B" fields. Excluding it here instead
// means it's simply invisible until the sender fixes the recipient list —
// the (separate) sender-side guard in field-editor.tsx's handleSend is
// what should be preventing this state from ever reaching a sent document.
export function visibleFieldsForSigner<T extends VisibilityField>(
  fields: T[],
  signerId: string,
  signerCount: number
): T[] {
  return fields.filter(
    (f) => f.signer_id === signerId || (f.signer_id === null && f.template_role === null && signerCount === 1)
  );
}

// Which of these signers would open the document to nothing to sign — the
// exact state behind "I entered two recipients but signed everything from the
// first email, and it completed": one recipient got all the fields, the other
// got none, so that second signer only ever consents to an empty document.
// The send route uses this to BLOCK sending until every signer has a field
// (mirrored client-side in field-editor.tsx). Uses the same visibility rule as
// the signing page/submit so the three can't drift.
export function signersWithoutFields<T extends VisibilityField>(fields: T[], signerIds: string[]): string[] {
  return signerIds.filter((id) => visibleFieldsForSigner(fields, id, signerIds.length).length === 0);
}
