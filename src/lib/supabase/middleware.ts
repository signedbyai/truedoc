import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainFor } from "@/lib/cookie-domain";

// Refreshes the Supabase auth session on every request and redirects
// unauthenticated users away from /dashboard routes.
//
// `baseResponse` (2026-07-31) — lets a caller supply the response this
// should attach refreshed-session cookies onto, instead of always
// building its own NextResponse.next(). Needed because src/middleware.ts
// early-returns a NextResponse.rewrite(...) for console.signedby.ai's "/"
// and "/app" — without this, those two routes never got a chance to
// refresh an expiring token or re-apply the *.signedby.ai domain-widened
// cookie at all, since updateSession was never even called for them. Live
// bug report: console "recognized the plan" in Chrome but forced a
// re-sign-in and lost plan info in Safari — consistent with Chrome
// happening to carry a still-fresh cookie (refreshed recently via a
// normal /dashboard visit, which DID call updateSession) while Safari's
// had gone stale with no refresh path ever exercised on console's own
// routes.
export async function updateSession(request: NextRequest, baseResponse?: NextResponse) {
  let supabaseResponse = baseResponse ?? NextResponse.next({ request });

  // See cookie-domain.ts — widens the auth cookie to *.signedby.ai (when
  // actually on that domain family) so a session carries over between
  // signedby.ai and console.signedby.ai.
  const cookieDomain = cookieDomainFor(request.headers.get("host"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Only rebuild a fresh NextResponse.next() wrapper when we own
          // the response ourselves — a caller-supplied baseResponse (e.g.
          // a console-subdomain rewrite) must stay the exact same response
          // object, or its rewrite target would be lost; cookies just
          // accumulate onto it across however many setAll calls happen.
          if (!baseResponse) supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
