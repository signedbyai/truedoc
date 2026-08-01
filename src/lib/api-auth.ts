import { createAdminClient } from "@/lib/supabase/admin";
import { extractApiKey, hashApiKey } from "@/lib/api-key";
import { planHasFeature } from "@/lib/plan";

export type ApiAuthResult =
  | { ok: true; orgId: string; orgName: string; metered: boolean; freeCapped: boolean }
  | { ok: false; status: number; error: string };

// Authenticates a /api/v1/* request against an org's stored API key hash.
// Also re-checks the plan at request time (not just at key-generation time)
// so a downgrade takes effect immediately rather than only on regeneration.
//
// Three ways in now, per API_TIER_SCOPE.md (2026-08-02, direct instruction —
// supersedes this comment's original two-way version): Business orgs
// (`apiAccess`) get unlimited included access — `metered` and `freeCapped`
// are both false for them, callers should never bill or cap their usage.
// Pro/Team orgs (`consoleAccess`) get real REST API + webhook access too
// now (previously Business-only), but stay `metered` — the caller (the
// document-send route) reports usage via src/lib/console-usage.ts, same as
// before. Free-tier orgs are let through for the first time as well
// (`freeCapped: true`, not metered) — capped by the same
// 3-documents/month limit the dashboard UI already enforces
// (`checkFreePlanDocCap` in plan.ts), so a developer can build and test
// against a real account before paying, same positioning SignNow/
// eSignatures.com use for their own free/sandbox tiers. A caller that
// ignores `metered`/`freeCapped` entirely just gets the old Business-only
// unlimited behavior, so none of this is a breaking change to any existing
// route.
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
  // Every real paid plan already grants at least `consoleAccess`, so
  // reaching this branch means the org is on Free (or has no plan set,
  // which `planHasFeature` already treats as Free) — let through, capped
  // rather than blocked.
  const freeCapped = !hasUnlimitedAccess && !hasMeteredAccess;

  return {
    ok: true,
    orgId: org.id,
    orgName: org.name,
    metered: !hasUnlimitedAccess && hasMeteredAccess,
    freeCapped,
  };
}
