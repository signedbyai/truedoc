// Detects a user's very first successful sign-in, with no new column or
// migration — Supabase Auth already returns both `created_at` (account
// creation) and `last_sign_in_at` (this session) on every successful
// verifyOtp/signInWithPassword/exchangeCodeForSession call. There's no
// separate signup step in this app (see login/actions.ts's sendPasswordReset
// comment): a brand-new email's account row and its first sign-in happen
// close together, so the two timestamps land within a short window of each
// other. Every later login has a `last_sign_in_at` that's minutes, days, or
// weeks after `created_at` — so this only ever fires once, on the real
// first login, then never again for that account.
//
// Window is deliberately generous (30 min), not a tight few-second check:
// for the OTP flow, `created_at` may be set the moment the code email is
// *sent*, while `last_sign_in_at` is only set once the user actually opens
// the email and enters the code — which could be several minutes later for
// a slow-to-check inbox. A too-tight window risks the worse failure mode
// (silently skipping the redirect on a genuine first login); the cost of
// a generous one is a single rare, low-stakes edge case (a user who signs
// out and back in within 30 minutes of creating the account sees the
// upload page a second time instead of the dashboard).
//
// 2026-08-04, direct instruction: first login should land on the new
// document upload page instead of the dashboard; every login after that
// goes to the dashboard as normal. See login/actions.ts (verifyLoginCode,
// signInWithPassword) and auth/callback/route.ts for the call sites.
const FIRST_LOGIN_WINDOW_MS = 30 * 60_000;

export function isFirstLogin(
  user: { created_at: string; last_sign_in_at: string | null } | null | undefined
): boolean {
  if (!user?.last_sign_in_at) return false;
  const created = new Date(user.created_at).getTime();
  const signedIn = new Date(user.last_sign_in_at).getTime();
  if (Number.isNaN(created) || Number.isNaN(signedIn)) return false;
  return Math.abs(signedIn - created) < FIRST_LOGIN_WINDOW_MS;
}
