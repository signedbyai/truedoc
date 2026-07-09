import { createAdminClient } from "@/lib/supabase/admin";

// Shared lookup for the signer-facing flow. The signer proves identity via
// an unguessable `signing_token` (no Supabase auth session), so every route
// here goes through the service-role admin client and bypasses RLS —
// access control is entirely "do you know the token."
export async function getSignerByToken(token: string) {
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signers")
    .select("id, document_id, name, email, order_index, status, signed_at")
    .eq("signing_token", token)
    .single();

  if (!signer) return null;

  const { data: document } = await admin
    .from("documents")
    .select("id, title, page_count, org_id, status")
    .eq("id", signer.document_id)
    .single();

  if (!document) return null;

  return { admin, signer, document };
}
