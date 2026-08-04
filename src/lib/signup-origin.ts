import { createAdminClient } from "@/lib/supabase/admin";

// Records which host (signedby.ai vs console.signedby.ai) an account's true
// first login/signup happened on — 2026-08-04, direct ask: "I need to be
// able to tell what the origination of the new account was." Called only
// when isFirstLogin(user) is true (see first-login.ts), from all three
// sign-in completion paths.
//
// Deliberately takes the ALREADY-RESOLVED origin, not a raw Host header —
// how to resolve it differs by call site and isn't this function's job:
// - login/actions.ts's verifyLoginCode/signInWithPassword: /login is served
//   unrewritten on both hosts (middleware.ts only rewrites "/" and "/app"),
//   so headers().get("host") on that request is reliable — isConsoleHost()
//   on it directly.
// - auth/callback/route.ts (magic-link/OAuth): that route's own doc comment
//   is explicit — it ALWAYS runs on the fixed signedby.ai domain regardless
//   of which host the user actually started on, since Supabase's Redirect
//   URLs allowlist doesn't cover console.signedby.ai. A Host header read
//   there would be wrong every time. The reliable signal on that path is
//   whether `next === "/app"` — that value only ever gets baked into the
//   magic-link's emailRedirectTo when the login page itself was reached via
//   console/app/page.tsx's auth gate (see consoleAppNextPath).
//
// Looks up the org via organization_members the same way getUserAndOrg()
// does (org.ts), rather than calling that function directly — it reads the
// session through createClient()'s cookie-bound client, which isn't
// reliably populated yet inside the same server action/route that just
// created the session. createAdminClient() sidesteps that by querying
// directly with the user id already in hand.
//
// First-write-wins, same posture as the existing signup_utm_* columns
// (0024_signup_attribution.sql, see api/attribution/capture/route.ts) —
// .is("signup_origin_host", null) on the update means a second call (there
// shouldn't be one, since this only ever runs on a real first login) can't
// clobber an already-recorded value.
export async function recordSignupOriginHost(userId: string, originHost: "signedby.ai" | "console.signedby.ai"): Promise<void> {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership) return;

  await admin.from("organizations").update({ signup_origin_host: originHost }).eq("id", membership.org_id).is("signup_origin_host", null);
}
