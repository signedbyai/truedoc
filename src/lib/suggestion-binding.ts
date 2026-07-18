// Who should an AI-suggested field belong to? Extracted from
// field-editor.tsx after a real customer got stuck (2026-07-14): they added
// their recipient FIRST, then ran "Suggest fields" — and nothing ever bound
// the role-tagged suggestions to that recipient, because the only claim
// logic lived in addRecipient (which had already run). Confirming a
// suggestion didn't help either (confirmField ignored the selected
// recipient chip), so send blocked with "remove it and re-place it" — a
// dead end with no assignment UI.
//
// Two moments need an answer, with different rules:

export type RecipientRef = { id: string; order_index: number };

/**
 * A fresh suggestion arriving from the AI: bind a role-tagged suggestion
 * ("Party N") to the recipient already occupying slot N, exactly mirroring
 * addRecipient's claim rule so recipients-then-suggest and
 * suggest-then-recipients end in the same state. Deliberately does NOT use
 * the active chip here — mass-assigning a whole batch of suggestions to
 * whoever happens to be selected would be wrong for multi-party documents.
 */
export function signerForArrivingSuggestion(
  role: number | null,
  recipients: RecipientRef[]
): string | null {
  if (role === null) return null;
  return recipients.find((r) => r.order_index === role)?.id ?? null;
}

/**
 * The sender confirming a still-unassigned suggestion (tap, drag, or ✓).
 * Precedence: the selected recipient chip (an explicit choice — same
 * semantics as manually placing a field), then the role→slot match, then
 * the sole recipient when there's exactly one (matches the send-time rule
 * that a single untagged recipient safely receives unassigned fields).
 * Returns null only when genuinely ambiguous (2+ recipients, none chosen,
 * no role match) — the case the send-time orphan check should still catch.
 */
export function signerForConfirmedSuggestion(opts: {
  templateRole: number | null;
  activeRecipientId: string | null;
  recipients: RecipientRef[];
}): string | null {
  const { templateRole, activeRecipientId, recipients } = opts;
  if (activeRecipientId && recipients.some((r) => r.id === activeRecipientId)) return activeRecipientId;
  const roleMatch = signerForArrivingSuggestion(templateRole, recipients);
  if (roleMatch) return roleMatch;
  if (recipients.length === 1) return recipients[0].id;
  return null;
}
