import { createAdminClient } from "@/lib/supabase/admin";
import { extractApiKey, hashApiKey } from "@/lib/api-key";
import { planHasFeature } from "@/lib/plan";

export type ApiAuthResult =
  | { ok: true; orgId: string; orgName: string; metered: boolean }
  | { ok: false; status: number; error: string };

// Authenticates a /api/v1/* request against an org's stored API key hash.
// Also re-checks the plan at request time (not just at key-generation time)
// so a downgrade takes effect immediately rather than only on regeneration.
//
// Two ways in, per CONSOLE_AI_SIGNING_SCOPE.md: Business orgs (`apiAccess`)
// get unlimited included access, same as before this existed — `metered` is
// false for them, and callers should never bill their usage. Pro/Team orgs
// (`consoleAccess`) get in too, but `metered` is true — the caller (the
// document-send route) is responsible for reporting that usage; see
// src/lib/console-usage.ts. A caller that ignores `metered` entirely just
// gets the old Business-only behavior, so this is additive, not a breaking
// change to any existing route.
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

  const hasUnlimitedAccess = planHasFeature(org.plan, "apiAccess");
  const hasMeteredAccess = planHasFeature(org.plan, "consoleAccess");
  if (!hasUnlimitedAccess && !hasMeteredAccess) {
    return {
      ok: false,
      status: 402,
      error:
        "API access requires the Pro plan (metered, via console.signedby.ai) or the Business plan (unlimited, included).",
    };
  }

  return { ok: true, orgId: org.id, orgName: org.name, metered: !hasUnlimitedAccess };
}
