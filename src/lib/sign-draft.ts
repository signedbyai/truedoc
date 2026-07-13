// Local (browser-only) autosave for an in-progress signing session — pure,
// unit-testable helpers extracted from signing-view.tsx, which has no
// component-test infrastructure of its own (no established pattern in this
// codebase for testing a client component this size). Deliberately never
// touches consent: only field *values* are saved/restored here, so a
// signer must still actively re-check "I agree" every time, even right
// after restoring a draft — preserves the deliberate-consent story that
// makes an e-signature legally meaningful (same reasoning behind this
// app's earlier rejection of a silently-auto-applied saved signature).

const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // a week

export function draftStorageKey(token: string): string {
  return `signedby:sign-draft:${token}`;
}

export type SignDraft = { values: Record<string, string>; savedAt: number };

/** Builds the JSON string to persist — a thin wrapper, but kept alongside
 *  parseDraft so the shape only needs to be described in one place. */
export function serializeDraft(values: Record<string, string>, now: number): string {
  const draft: SignDraft = { values, savedAt: now };
  return JSON.stringify(draft);
}

/**
 * Parses a raw localStorage value back into a values map, or null if it's
 * missing, malformed, or older than MAX_DRAFT_AGE_MS (a stale draft from a
 * link opened long ago — already signed/declined elsewhere, or simply
 * abandoned — shouldn't resurface unexpectedly). Never throws — a corrupt
 * or unexpected value just means the signer starts blank, same as if
 * nothing had been saved at all.
 */
export function parseDraft(raw: string | null, now: number): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SignDraft> | null;
    if (!parsed || typeof parsed !== "object" || typeof parsed.values !== "object" || parsed.values === null) {
      return null;
    }
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      return null;
    }
    return parsed.values as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * Merges a restored draft into the current values map — only fills in
 * fields that are (a) currently empty and (b) still a real field on this
 * document (a sender could in principle have removed a field between the
 * signer's first visit and a later restore). Never overwrites a value
 * that's already present, whether that came from the server or from
 * something the signer already re-entered this session.
 */
export function mergeRestoredValues(
  current: Record<string, string>,
  restored: Record<string, string> | null,
  fieldIds: string[]
): Record<string, string> {
  if (!restored) return current;
  const fieldIdSet = new Set(fieldIds);
  const merged = { ...current };
  for (const [id, value] of Object.entries(restored)) {
    if (fieldIdSet.has(id) && !merged[id]?.trim() && value?.trim()) {
      merged[id] = value;
    }
  }
  return merged;
}

/** Whether a values map has anything worth persisting at all — avoids
 *  writing a meaningless localStorage entry for every signer who opens the
 *  link and leaves without filling anything in. */
export function hasAnyValue(values: Record<string, string>): boolean {
  return Object.values(values).some((v) => v?.trim());
}
