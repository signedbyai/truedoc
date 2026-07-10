// Feature gating for paid-tier functionality. Kept as a single source of
// truth so the app logic always matches what pricing-cards.tsx promises —
// see that file for the customer-facing copy these gates enforce.
export type PlanId = "free" | "starter" | "team" | "business";

const FEATURE_PLANS = {
  // Starter: "Templates & reminders" — saving/using templates and both
  // manual + automatic signer reminders.
  templates: ["starter", "team", "business"],
  reminders: ["starter", "team", "business"],
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
  // Business: "Payment collection" — an external link (e.g. a Stripe Payment
  // Link the org already owns), not a Connect-style in-app charge. See
  // src/app/api/documents/[id]/payment/route.ts for why.
  paymentCollection: ["business"],
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function planHasFeature(plan: string | null | undefined, feature: Feature): boolean {
  return (FEATURE_PLANS[feature] as readonly string[]).includes(plan || "free");
}

export const FEATURE_UPGRADE_PLAN: Record<Feature, PlanId> = {
  templates: "starter",
  reminders: "starter",
  teamMembers: "team",
  bulkSend: "team",
  branding: "team",
  customBranding: "business",
  apiAccess: "business",
  paymentCollection: "business",
};
