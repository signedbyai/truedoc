import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { CONSOLE_HOST } from "@/lib/console-host";

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
