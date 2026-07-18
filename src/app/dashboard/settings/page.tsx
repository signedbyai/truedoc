import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature, teamMemberLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BrandingSettings } from "@/components/branding-settings";
import { ApiKeySettings } from "@/components/api-key-settings";
import { AutoSuggestSettings } from "@/components/auto-suggest-settings";

// Grouped by concern, not by tier: Workspace (identity) → Automation & AI →
// Integrations → Plan & team. Plan/seat management actually lives on separate
// pages (/dashboard/billing, /dashboard/team), so the last card is a signpost
// to them — people look for those here first.
export default async function SettingsPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan, logo_url, brand_color, api_key_prefix, auto_suggest_on_upload")
    .eq("id", orgId)
    .single();

  if (!org) redirect("/dashboard");

  const hasCustomBranding = planHasFeature(org.plan, "customBranding");
  const hasApiAccess = planHasFeature(org.plan, "apiAccess");
  const planLabel = PLAN_LABEL[org.plan ?? "free"] ?? org.plan;
  const seatCap = teamMemberLimit(org.plan);

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Workspace, automation, integrations, and your plan.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              {hasCustomBranding
                ? "Your name, logo, and brand color appear on the signing page instead of the default SignedBy footer."
                : "Your workspace name, logo, and brand color replace the default SignedBy footer on the signing page (Team plan)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandingSettings
              orgId={orgId}
              initialName={org.name}
              initialBrandColor={org.brand_color}
              hasLogo={Boolean(org.logo_url)}
              hasCustomBranding={hasCustomBranding}
            />
            {/* No upgrade CTA here — BrandingSettings already says "available
                on the Team plan" inline next to the logo and colour controls,
                so the dashed box was a redundant second ask in the same card. */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation &amp; AI</CardTitle>
            <CardDescription>Controls when AI-suggested field placements run for new documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <AutoSuggestSettings initialEnabled={org.auto_suggest_on_upload} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration &amp; API</CardTitle>
            <CardDescription>
              {hasApiAccess
                ? "Wire SignedBy into your CRM, app, or onboarding flow. Use the key below to create, send, and track documents from your own code."
                : "Wire SignedBy into your CRM, app, or onboarding flow — create, send, and track documents without anyone opening a browser. Copy the API URL and generate the key here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasApiAccess ? (
              <div className="space-y-4">
                <ApiKeySettings apiKeyPrefix={org.api_key_prefix} />
                {/* Shown inline (not collapsed) — for a Business customer who
                    came here to wire up the API, the examples are the point of
                    the card, not reference material to go hunting for. */}
                <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-900">Create &amp; send a document</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"template_id":"<template-id>","signer":{"email":"jane@acme.com","name":"Jane"}}'`}
                  </pre>
                  <p className="mt-3 font-medium text-slate-900">Check status</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl https://signedby.ai/api/v1/documents/<document-id> \\
  -H "Authorization: Bearer sb_live_..."`}
                  </pre>
                </div>
              </div>
            ) : (
              // Plain gate line only, same as the Workspace card — no dashed
              // upgrade box. The Plan & team card below is the one place that
              // routes people to billing.
              <p className="text-xs text-slate-500">API access is available on the Business plan.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan &amp; team</CardTitle>
            <CardDescription>
              You&apos;re on the {planLabel} plan
              {seatCap ? ` — up to ${seatCap} user${seatCap === 1 ? "" : "s"}.` : "."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Manage billing
              </Link>
              <Link href="/dashboard/team" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Manage team
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demoted from a full card to a footnote — a large "Coming soon" box
            was taking prime space while delivering nothing. Promote it back
            once the endpoint config actually ships. */}
        <p className="text-center text-xs text-slate-400">
          Coming soon: Business-owned AI — route AI features to your own private, OpenAI-compatible endpoint so
          document text never leaves your infrastructure.
        </p>
      </div>
    </main>
  );
}
