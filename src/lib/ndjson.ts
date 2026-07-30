// Pure NDJSON (newline-delimited JSON) helpers, split out from
// console-chat.tsx's stream-reading loop so the parsing logic is
// unit-testable without a real fetch Response/ReadableStream (same
// extract-the-pure-part precedent as resolveActiveOrgId in org.ts).
// Used by the console chat client to read /api/console/chat's streamed
// status + final-result lines (see src/app/api/console/chat/route.ts).

/** Splits a growing buffer into complete lines plus whatever partial line
 *  is still waiting for more bytes. Empty/whitespace-only lines are
 *  dropped (NDJSON producers often end a chunk with a trailing newline,
 *  which would otherwise show up as a spurious empty "line"). */
export function splitNdjsonLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.trim().length > 0), rest };
}

/** Parses one line as JSON, or null if it isn't valid JSON — malformed
 *  lines are dropped rather than thrown, since a single bad line shouldn't
 *  take down an otherwise-working stream. */
export function parseNdjsonLine(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
