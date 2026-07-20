import { createHash, randomInt } from "crypto";

// Per-recipient authentication (Business tier, PER_RECIPIENT_AUTH_SCOPE.md):
// a signer required to verify enters a 6-digit code emailed to them before
// the signing link opens the document.

export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Below this age, a signer hitting "resend" is almost certainly a double
// click, not a genuinely lost email — throttled in the request route.
export const AUTH_CODE_RESEND_COOLDOWN_MS = 30 * 1000;
// Failed attempts against the CURRENT code before it's rejected outright,
// forcing a fresh code request rather than continued guessing.
export const AUTH_CODE_MAX_ATTEMPTS = 8;

export function generateAuthCode(): string {
  return randomInt(0, 10 ** AUTH_CODE_LENGTH).toString().padStart(AUTH_CODE_LENGTH, "0");
}

// Salted with the signer's own id — unique per row (a random uuid), so this
// doesn't need a separate secret store any more than api-key.ts's key
// hashing does; two signers who happen to land on the same 6-digit code
// still hash differently.
export function hashAuthCode(code: string, signerId: string): string {
  return createHash("sha256").update(`${signerId}:${code}`).digest("hex");
}

export function authCodeExpiryIso(): string {
  return new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();
}

// True if a code issued at `expiresAtIso` (an auth_code_expires_at value)
// was requested more recently than the resend cooldown allows.
export function isWithinResendCooldown(expiresAtIso: string | null, now: number = Date.now()): boolean {
  if (!expiresAtIso) return false;
  const expiresAt = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresAt)) return false;
  const issuedAt = expiresAt - AUTH_CODE_TTL_MS;
  return now - issuedAt < AUTH_CODE_RESEND_COOLDOWN_MS;
}
