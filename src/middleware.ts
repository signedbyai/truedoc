import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// console.signedby.ai (CONSOLE_AI_SIGNING_SCOPE.md) is a vanity hostname for
// the same app, not a separate deployment — the codebase has no other
// hostname-aware routing (dev.signedby.ai is a genuinely separate Vercel
// deployment/branch gated by DEV_ACCESS_ALLOWLIST, see dev-access.ts, not a
// rewrite). Only the bare root path is rewritten, so /login, /api/*,
// /dashboard, etc. keep working normally under this hostname too — this
// exists purely so the subdomain's homepage shows the console pitch instead
// of the marketing homepage.
const CONSOLE_HOST = "console.signedby.ai";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host === CONSOLE_HOST && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/console";
    return NextResponse.rewrite(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
