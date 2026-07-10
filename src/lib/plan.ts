// Feature gating for paid-tier functionality. Kept as a single source of
// truth so the app logic always matches what pricing-cards.tsx promises —
// see that file for the customer-facing copy these gates enforce.
export type PlanId = "free" | "starter" | "team" | "business";

const FEATURE_PLANS = {
  // Team: "Shared templates" — multiple org members, so templates/documents
  // become genuinely shared instead of single-user.
  teamMembers: ["team", "business"],
  // Team: "Bulk send"
  bulkSend: ["team", "business"],
  // Team: "Basic branding" — org name replaces the default SignedBy footer
  // on the signing page. Business: "Custom branding" — org logo + color too.
  branding: ["team", "business"],
  customBranding: ["business"],
  // Business: "API access"
  apiAccess: ["business"],
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function planHasFeature(plan: string | null | undefined, feature: Feature): boolean {
  return (FEATURE_PLANS[feature] as readonly string[]).includes(plan || "free");
}

export const FEATURE_UPGRADE_PLAN: Record<Feature, PlanId> = {
  teamMembers: "team",
  bulkSend: "team",
  branding: "team",
  customBranding: "business",
  apiAccess: "business",
};
