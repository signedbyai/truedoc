import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainFor } from "@/lib/cookie-domain";

// Refreshes the Supabase auth session on every request and redirects
// unauthenticated users away from /dashboard routes.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
