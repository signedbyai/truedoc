// Widens the Supabase auth cookie's Domain attribute to all of
// *.signedby.ai instead of the exact host that set it — needed 2026-07-30
// so a session started on signedby.ai carries over to console.signedby.ai
// (and back), letting the console's "back to the main app" link and the
// signedby.ai/console marketing CTA's cross-host jump both work without
// forcing a second sign-in. Same cookie, same purpose (auth), just a wider
// scope — not a new cookie.
//
// Guarded to only widen the domain when actually serving from a
// signedby.ai (sub)domain: a Domain=.signedby.ai cookie is invalid (and
// silently rejected by the browser) on any other origin — localhost during
// local dev, or a bare Vercel preview URL — so those fall back to
// `undefined` here, which leaves Supabase's default host-only cookie
// behavior untouched, exactly as it worked before this change.
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const bare = host.split(":")[0].toLowerCase();
  return bare === "signedby.ai" || bare.endsWith(".signedby.ai") ? ".signedby.ai" : undefined;
}
