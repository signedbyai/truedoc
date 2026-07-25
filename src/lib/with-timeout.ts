// Races a promise against a timer so a hung network call fails after a bound
// instead of waiting forever. Used both server-side (r2.ts, for a stalled R2
// read that never errors, just never responds) and client-side
// (signing-view.tsx, for a stalled/slow PDF load on the signer's own
// connection — see DOCUMENT_ARCHITECTURE.md and the 2026-07-25 audit).
// Kept here as one small, independently testable helper rather than
// duplicated inline in both places, since a hang is a plain-JS setTimeout
// race either way — nothing server- or browser-specific about it.

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Resolves/rejects with whatever `promise` does, UNLESS `ms` elapses first,
 * in which case it rejects with a TimeoutError. `onTimeout`, if given, fires
 * right before that rejection — the caller's chance to cancel/clean up the
 * now-abandoned attempt (e.g. destroying a pdf.js loading task) so it can't
 * sneak a late result in after the caller has already moved on.
 *
 * `promise` itself is always given a `.then(resolve, reject)` handler here,
 * so if it settles after the timeout has already won the race, that later
 * settlement is safely absorbed (no unhandled rejection) — it's just ignored.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new TimeoutError(ms));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
