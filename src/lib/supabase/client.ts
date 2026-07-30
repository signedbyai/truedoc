import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainFor } from "@/lib/cookie-domain";

// Browser-side Supabase client. Uses the public anon key — safe to expose,
// RLS policies (see supabase/migrations/0001_init.sql) restrict what it can touch.
export function createClient() {
  // See cookie-domain.ts — widens the auth cookie to *.signedby.ai (when
  // actually on that domain family) so a session carries over between
  // signedby.ai and console.signedby.ai.
  const cookieDomain = typeof window !== "undefined" ? cookieDomainFor(window.location.hostname) : undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
  );
}
