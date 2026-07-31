import { serialize, type SerializeOptions as CookieOptions } from "cookie";

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

/** Live bug, found + fixed 2026-07-31: a browser with an auth cookie from
 *  BEFORE the widening above (2026-07-30) now holds two coexisting copies
 *  of the same-named Supabase session cookie chunks — an old host-only one
 *  (no Domain attribute) and a new one scoped to Domain=.signedby.ai.
 *  Browsers treat different Domain values as different cookies, so setting
 *  the new one never overwrites the old one; both get sent on every
 *  request. Supabase's chunk reassembly then sometimes mixes a fresh chunk
 *  from one with a stale chunk from the other, fails to decode the result
 *  ("Invalid UTF-8 sequence"), and silently treats the whole session as
 *  absent — which is what was actually causing "sign in just returns to
 *  the login screen" (a real session WAS created; the very next request
 *  just couldn't read it back). Reproduced live: Google OAuth succeeded,
 *  /auth/callback exchanged the code fine, but the immediate /dashboard
 *  hit bounced straight back to /login with no session found.
 *
 *  Fix: whenever we write a cookie with the widened domain, also emit a
 *  companion Set-Cookie that immediately expires the OLD host-only
 *  version of that exact name, so the two can never coexist for long.
 *  This can't be done via `response.cookies.set()` alone — Next's
 *  ResponseCookies keys its internal map by name only and rebuilds the
 *  entire Set-Cookie header from that map on every `.set()` call (see
 *  @edge-runtime/cookies' `replace()`), so a second `.set()` for the same
 *  name just overwrites the first instead of coexisting. Two Set-Cookie
 *  headers with an identical name but different Domain values can only
 *  coexist by appending the second one directly onto the raw Headers
 *  object — which is why this must run strictly AFTER every real
 *  `response.cookies.set(...)` call for the response (a later `.set()`
 *  would wipe this back out); callers must call this last. */
export function clearStaleHostOnlyCookies(
  response: { headers: Headers },
  cookiesSet: { name: string; options: CookieOptions }[]
): void {
  for (const { name, options } of cookiesSet) {
    response.headers.append(
      "set-cookie",
      serialize(name, "", {
        path: options.path ?? "/",
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        maxAge: 0,
        expires: new Date(0),
        // No `domain` here on purpose — that's what targets the old
        // host-only cookie instead of the new domain-wide one.
      })
    );
  }
}
