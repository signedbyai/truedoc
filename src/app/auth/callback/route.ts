import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consoleUrl } from "@/lib/console-host";
import { isFirstLogin } from "@/lib/first-login";
import { recordSignupOriginHost } from "@/lib/signup-origin";
import { claimPendingAttribution } from "@/lib/pending-attribution";

// Handles the redirect from the Supabase magic-link email (and, via
// login/page.tsx's handleOAuth, Google/Microsoft), exchanges the code for
// a session, then sends the user on to `next`.
//
// This route always runs on the fixed main domain (signedby.ai) — both
// sendMagicLink's emailRedirectTo (actions.ts) and handleOAuth's
// redirectTo point here regardless of which host the user actually
// started sign-in from, to dodge Supabase's Redirect URLs allowlist not
// covering console.signedby.ai (see login/page.tsx's handleOAuth comment,
// 2026-07-30). That means `next` normally being treated as same-origin
// relative is right for every real /dashboard/... destination, but wrong
// for the one destination that actually lives on a different host: the
// console app. Bug found 2026-07-30 — a console sign-in landed on a bare
// https://signedby.ai/app (404), because `next=/app` isn't a route on
// this domain, only on console.signedby.ai (see middleware.ts's rewrite).
// Special-cased rather than generally allowing an absolute `next` through
// — that would reopen the open-redirect hole sanitizeNextPath exists to
// close (see safe-redirect.ts) for a value that ultimately traces back to
// a query param.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext ?? "/dashboard";

  if (code) {
    // Built up front and handed into createClient() (2026-07-31, live bug
    // fix) rather than exchanging the code first and building this after —
    // exchangeCodeForSession's Set-Cookie writes need to land on THIS
    // exact response object so clearStaleHostOnlyCookies can append onto
    // it afterward. See createClient's `response` param and
    // cookie-domain.ts's clearStaleHostOnlyCookies for the full story:
    // a stale pre-2026-07-30 host-only cookie coexisting with the new
    // domain-wide one was corrupting the session on the very next request,
    // which is what made sign-in silently bounce back to /login.
    const response = NextResponse.redirect(next === "/app" ? consoleUrl("/app") : `${origin}${next}`);
    const supabase = await createClient(response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const firstLogin = isFirstLogin(data.user);
      if (firstLogin && data.user) {
        // signedby.ai vs console.signedby.ai (2026-08-04, direct ask) — this
        // route always runs on the fixed signedby.ai domain (see doc comment
        // above), so a Host header here would be wrong every time. `next ===
        // "/app"` is the reliable signal instead: it's only ever baked into
        // the magic-link's emailRedirectTo when the login page was reached
        // via console/app/page.tsx's own auth gate (consoleAppNextPath).
        await recordSignupOriginHost(data.user.id, next === "/app" ? "console.signedby.ai" : "signedby.ai");
        // THE path this fix exists for (2026-08-13, see
        // 0055_pending_attribution.sql). Getting here means they completed
        // signup by clicking the magic link, which on mobile almost always
        // opens in a different browser than the ad landed in — so the
        // localStorage attribution-claim.tsx looks for is gone, and this
        // server-side row keyed off their email address is the only surviving
        // record of which campaign brought them.
        await claimPendingAttribution(data.user.id, data.user.email);
      }
      // A sign-in with no explicit ?next destination lands on the plain
      // dashboard (`next`'s own "/dashboard" fallback above already
      // handles this — no override needed here). Used to send people
      // straight to the new-document flow instead (2026-08-04 direct
      // instruction), reverted 2026-08-21 direct ask: back to landing on
      // the home screen. Matches login/page.tsx's
      // verifyLoginCode/signInWithPassword handlers. Console is
      // unaffected either way — its own login links always carry an
      // explicit next=/app (see console/page.tsx).
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
