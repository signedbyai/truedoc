import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consoleUrl } from "@/lib/console-host";

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
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next === "/app") {
        return NextResponse.redirect(consoleUrl("/app"));
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
