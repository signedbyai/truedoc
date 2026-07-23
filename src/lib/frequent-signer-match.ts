export type MatchableSigner = { id: string; name: string; email: string };

/**
 * Phase 2 of the frequent-signers backlog item: matches a name the AI
 * extracted from a document (suggest-fields.ts's per-party `name`) against
 * the org's saved frequent signers, so a returning counterparty's email can
 * be pre-filled in the "we detected N signers" panel instead of the sender
 * retyping it every time.
 *
 * Deliberately strict -- case-insensitive, whitespace-trimmed EXACT match
 * only, no fuzzy/partial matching. A substring match on "John" against both
 * "John Smith" and "John Doe" would be a coin-flip on who gets emailed, and
 * unlike the name field (which the sender is always shown and asked to
 * check), an auto-filled email is the one mistake in this flow that sends
 * the document to the wrong person -- see field-editor.tsx's existing
 * comment on why email is otherwise never pre-filled from document text.
 * Zero or multiple matches both return null; only a single unambiguous
 * match is confident enough to act on.
 */
export function matchFrequentSignerByName(name: string, signers: MatchableSigner[]): MatchableSigner | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const matches = signers.filter((s) => s.name.trim().toLowerCase() === needle);
  return matches.length === 1 ? matches[0] : null;
}
