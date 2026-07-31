import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { cookieDomainFor, clearStaleHostOnlyCookies } from "@/lib/cookie-domain";

// Server-side Supabase client for use in Server Components, Route Handlers,
// and Server Actions. Reads/writes the auth session via cookies.
//
// `response` (2026-07-31, live bug fix) — lets a Route Handler that's
// about to write a REAL new session (currently only /auth/callback, via
// exchangeCodeForSession) hand in the exact NextResponse it's going to
// return, instead of writing through next/headers' cookies(). Needed
// because clearStaleHostOnlyCookies (cookie-domain.ts) has to append a
// raw Set-Cookie header directly, and next/headers' cookies() doesn't
// expose the underlying Headers object to append onto — only a
// NextResponse's own `.headers` does. Every other call site keeps calling
// createClient() with no argument and is completely unaffected.
export async function createClient(response?: NextResponse) {
  const cookieStore = await cookies();
  // See cookie-domain.ts — widens the auth cookie to *.signedby.ai (when
  // actually on that domain family) so a session carries over between
  // signedby.ai and console.signedby.ai.
  const cookieDomain = cookieDomainFor((await headers()).get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (response) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            // Must run after every response.cookies.set() above, not
            // interleaved — see clearStaleHostOnlyCookies' comment.
            if (cookieDomain) clearStaleHostOnlyCookies(response, cookiesToSet);
            return;
          }
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware is refreshing the session.
          }
        },
      },
    }
  );
}
