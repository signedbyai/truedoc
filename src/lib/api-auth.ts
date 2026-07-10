import { createAdminClient } from "@/lib/supabase/admin";
import { extractApiKey, hashApiKey } from "@/lib/api-key";
import { planHasFeature } from "@/lib/plan";

export type ApiAuthResult =
  | { ok: true; orgId: string; orgName: string }
  | { ok: false; status: number; error: string };

// Authenticates a /api/v1/* request against an org's stored API key hash.
// Also re-checks the plan at request time (not just at key-generation time)
// so a downgrade takes effect immediately rather than only on regeneration.
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const key = extractApiKey(request);
  if (!key) {
    return { ok: false, status: 401, error: "Missing API key. Pass it as 'Authorization: Bearer <key>'." };
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan")
    .eq("api_key_hash", hashApiKey(key))
    .single();

  if (!org) return { ok: false, status: 401, error: "Invalid API key." };
  if (!planHasFeature(org.plan, "apiAccess")) {
    return { ok: false, status: 402, error: "API access requires the Business plan." };
  }

  return { ok: true, orgId: org.id, orgName: org.name };
}
