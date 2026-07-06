import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses Row Level Security.
// Use ONLY in trusted server-side code (API routes, webhooks) that has
// already verified the caller, e.g. the signer-facing signing flow where
// the caller proves identity via an unguessable `signing_token` rather
// than a Supabase auth session.
//
// NEVER import this file into a Client Component or expose SUPABASE_SERVICE_ROLE_KEY
// to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
