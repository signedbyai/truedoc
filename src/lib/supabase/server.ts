import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainFor } from "@/lib/cookie-domain";

// Server-side Supabase client for use in Server Components, Route Handlers,
// and Server Actions. Reads/writes the auth session via cookies.
export async function createClient() {
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
