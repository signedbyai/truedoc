import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { CONSOLE_HOST } from "@/lib/console-host";

// Console entry gate, Starter+ only (2026-08-10, direct instruction: Free
// orgs landing on console.signedby.ai were a support/confusion cost —
// running two visually different interfaces (the classic dashboard vs.
// console's chat UI) confused people who hadn't paid for anything yet,
// while Starter/Team/Business have at least shown enough commitment to
// count as "experienced" for this purpose. This is a deliberate narrowing
// of CONSOLE_FREE_TIER_SCOPE.md's 2026-08-02 "every plan including free"
// decision — that decision optimized for a Free-tier acquisition funnel
// (badge sealing via console, capped at 3/month, with an upgrade CTA on
// hitting the cap); this one prioritizes support load over that funnel.
// Free-tier console *capability* (checkFreePlanSealCap, the
// consoleAccess:["free",...] feature-plan entry, the API sandbox) is left
// entirely alone — a Free org's REST API key still works exactly as
// before (the API lives at signedby.ai/api/v1, not this host, so it was
// never reachable through this gate anyway). Only the console.signedby.ai
// *web app* entry points are affected.
const CONSOLE_GATE_PLANS = new Set(["starter", "team", "business"]);

// Read-only plan lookup, deliberately separate from updateSession() below
// rather than threading a return value through it — updateSession has
// carefully-tuned cross-browser cookie-refresh behavior (see its own
// comment on baseResponse, and cookie-domain.ts's Chrome/Safari bug fix)
// that this shouldn't risk disturbing. One extra supabase.auth.getUser()
// network call on just the two console entry paths is the accepted cost
// of keeping that code untouched. Mirrors getUserAndOrg()'s
// (src/lib/org.ts) membership query and active-org resolution, but
// reimplemented locally rather than imported: org.ts pulls in
// @/lib/supabase/server, which uses next/headers — fine in Server
// Components/Route Handlers, not something to risk pulling into the Edge
// middleware bundle.
async function resolveConsoleGatePlan(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Read-only check — the request's own cookies are read as-is; any
        // refresh/rewrite still happens via the real updateSession() call
        // this request goes through afterward regardless of this check's
        // outcome.
        setAll() {},
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  // supabase-js returns network/server failures as { error } rather than
  // throwing — surfacing anything unexpected here as a thrown error (rather
  // than silently treating it like a genuine "no user") is what lets the
  // caller's try/catch fail OPEN during an outage instead of misreading
  // "the lookup broke" as "this visitor has no plan" and redirecting them.
  // Confirmed live in the sandbox (2026-08-10): getUser() with literally no
  // session cookie returns error.name === "AuthSessionMissingError", not a
  // clean { user: null, error: null } — that's the everyday "nobody's
  // logged in" case (the single most common visitor to this gate), NOT an
  // infra failure, so it's excluded from the throw and falls through to
  // the ordinary "no user" branch below (correctly triggering a redirect,
  // not a fail-open pass-through). See the caller's comment for the rest.
  if (userError && userError.name !== "AuthSessionMissingError") throw userError;
  if (!user) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("org_id, organizations(id, plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (membershipError) throw membershipError;
  if (!memberships || memberships.length === 0) return null;

  const orgs = memberships
    .map((m) => {
      // Embedded to-one relationships sometimes come back as an array
      // depending on how Supabase infers the join — same normalization
      // org.ts's getUserAndOrg does for the identical shape.
      const raw = m.organizations as unknown;
      return (Array.isArray(raw) ? raw[0] : raw) as { id: string; plan: string } | undefined;
    })
    .filter((o): o is { id: string; plan: string } => !!o);
  if (orgs.length === 0) return null;

  // Same "preferred active org, falling back to most-recently-joined"
  // resolution as resolveActiveOrgId (org.ts) — inlined rather than
  // imported for the same next/headers-in-the-Edge-bundle reason as above.
  const preferredOrgId = (user.user_metadata?.active_org_id as string | undefined) ?? null;
  const org = (preferredOrgId && orgs.find((o) => o.id === preferredOrgId)) || orgs[0];
  return org?.plan ?? null;
}

// console.signedby.ai is a vanity hostname for the same app/deployment, not
// a separate one — the codebase has no other hostname-aware routing
// (dev.signedby.ai is a genuinely separate Vercel deployment/branch gated
// by DEV_ACCESS_ALLOWLIST, see dev-access.ts, not a rewrite). Two paths are
// rewritten to give the subdomain its own self-contained "/" and "/app":
// everything else (/login, /auth/callback, /api/*, /dashboard, etc.) keeps
// working normally under this hostname too, unrewritten — that's what lets
// the whole sign-in flow complete without ever leaving console.signedby.ai
// (see console-host.ts, cookie-domain.ts, and the 2026-07-30 full-
// subdomain-separation work in CONSOLE_UX_SCOPE.md for the reasoning).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Markdown content negotiation, /developers only (2026-08-06, scoped
  // deliberately narrow — see the isitagentready.com discoverability pass
  // and IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE-adjacent chat). Checked actual
  // adoption before building this: Google's crawlers don't send
  // Accept: text/markdown at all, but Anthropic's own infrastructure and
  // Claude-based coding tools (Claude Code, OpenCode) do — exactly the
  // audience reading API docs, not general marketing copy, which is why
  // this isn't extended to the homepage or anywhere else.
  // /developers.md is a static, session-free route handler, so this
  // rewrites and returns immediately rather than routing through
  // updateSession below — there's no session-dependent content on it.
  if (pathname === "/developers" && (request.headers.get("accept") ?? "").includes("text/markdown")) {
    return NextResponse.rewrite(new URL("/developers.md", request.url));
  }

  const host = request.headers.get("host");
  if (host === CONSOLE_HOST) {
    const { pathname } = request.nextUrl;
    if (pathname === "/" || pathname === "/app") {
      // Starter+ gate (2026-08-10, direct instruction) — see
      // resolveConsoleGatePlan/CONSOLE_GATE_PLANS above for the full
      // reasoning. Checked ahead of the rewrites below: an unauthenticated
      // visitor (null plan) or a Free org both bounce straight to the
      // marketing homepage rather than ever reaching console's UI.
      //
      // Fails OPEN, not closed: if the lookup itself throws (a Supabase
      // hiccup/timeout, not a real "ineligible" result), that's caught
      // below and the request falls through to console unchecked rather
      // than redirecting. A rare false negative (someone briefly getting
      // into console who shouldn't) is a far smaller cost than every
      // paying Business customer's console going down whenever this one
      // extra network call has a bad moment.
      try {
        const plan = await resolveConsoleGatePlan(request);
        if (!plan || !CONSOLE_GATE_PLANS.has(plan)) {
          return NextResponse.redirect(new URL("https://signedby.ai/"));
        }
      } catch (err) {
        console.error("console entry gate: plan lookup failed, allowing request through", err);
      }
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/console";
      // Routed through updateSession (2026-07-31, was a bare
      // NextResponse.rewrite before) so these two console entry routes
      // still get their session refreshed/domain-widened like every other
      // route does — see the comment on updateSession's `baseResponse`
      // param for the live bug this fixed (Safari forcing a re-sign-in on
      // console that Chrome didn't hit).
      return await updateSession(request, NextResponse.rewrite(url, { request }));
    }
    if (pathname === "/app") {
      const url = request.nextUrl.clone();
      url.pathname = "/console/app";
      return await updateSession(request, NextResponse.rewrite(url, { request }));
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
