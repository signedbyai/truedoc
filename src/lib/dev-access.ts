// Restricts /dashboard access to a testing allowlist, but only in
// environments where DEV_ACCESS_ALLOWLIST is actually set -- meant for the
// dev preview subdomain, where that variable is scoped to the dev branch's
// Vercel environment. Unset (e.g. in production), this is a complete no-op,
// so merging this file into main carries no behavior change there.
//
// Not a hard security boundary: individual API routes under /api/* aren't
// separately checked, only the dashboard layout that fronts every
// /dashboard/* page. Good enough to keep existing users from wandering into
// a work-in-progress UI on the shared production backend; not meant to
// withstand a determined attacker probing routes directly.
export function isDevAccessAllowed(email: string | null | undefined): boolean {
  const raw = process.env.DEV_ACCESS_ALLOWLIST;
  if (!raw) return true; // not a gated environment
  if (!email) return false;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
