import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature, teamMemberLimit, PLAN_LABEL } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BrandingSettings } from "@/components/branding-settings";
import { ApiKeySettings } from "@/components/api-key-settings";
import { AutoSuggestSettings } from "@/components/auto-suggest-settings";
import { FrequentSignersSettings } from "@/components/frequent-signers-settings";
import { WebhookSettings } from "@/components/webhook-settings";
import { Collapsible } from "@/components/collapsible";

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
  const hasConsoleAccess = planHasFeature(org.plan, "consoleAccess");
  const hasAnyApiAccess = hasApiAccess || hasConsoleAccess;
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
                : "Your workspace name, logo, and brand color replace the default SignedBy footer on the signing page (Business plan)."}
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
            <CardTitle>Frequent signers</CardTitle>
            <CardDescription>
              Saved contacts you send to often. Pick one from the AI Drafter or Magic Quote to pre-fill them as the
              recipient instead of retyping their email every time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FrequentSignersSettings />
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
              {/* Three states now, not two (API_TIER_SCOPE.md, 2026-08-02) —
                  Free used to be a flat "you don't have this" gate line; it's
                  now a real (if capped) sandbox, same as SignNow/eSignatures.com
                  offer developers before they pay. */}
              {hasApiAccess
                ? "Wire SignedBy into your CRM, app, or onboarding flow. Use the key below to create, send, and track documents from your own code."
                : hasConsoleAccess
                  ? "Metered API access — 50 free document-sends a month, then billed per document. Use the key below to create, send, and track documents from your own code."
                  : "Free plan sandbox — the same 3 documents/month the dashboard gives you, reachable via the API too. Build and test against a real account before upgrading."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ApiKeySettings + examples now show for every plan, including
                Free — only Webhooks stays gated to Pro/Team/Business
                (hasAnyApiAccess) below, since that wasn't part of the
                free-sandbox decision. */}
            <div className="space-y-4">
                {/* No link to /dashboard/console here for now — Michael wants
                    it discoverable only by going directly to
                    console.signedby.ai while it's still early, same as the
                    marketing-page links removed 2026-07-30. Re-add once
                    it's ready to promote. */}
                <ApiKeySettings apiKeyPrefix={org.api_key_prefix} />
                {/* Collapsed by default (2026-08-02, direct ask) — was shown
                    inline unconditionally; the examples are reference
                    material someone reaches for once they're actually
                    wiring the API up, not something that needs to be visible
                    on first load of this card. See src/components/collapsible.tsx. */}
                <Collapsible label="Code examples">
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
                    <p className="mt-3 font-medium text-slate-900">Multi-party document (2+ signers)</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"template_id":"<template-id>","signers":[
    {"role":0,"email":"buyer@acme.com","name":"Buyer"},
    {"role":1,"email":"seller@acme.com","name":"Seller"}
  ]}'`}
                    </pre>
                    <p className="mt-3 font-medium text-slate-900">Set an expiration date, or require signer verification</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"template_id":"<template-id>","expires_at":"2026-08-15T00:00:00Z",
       "signer":{"email":"jane@acme.com","auth_required":true}}'`}
                    </pre>
                    <p className="mt-3 font-medium text-slate-900">Customize the invite email&apos;s subject &amp; message</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"template_id":"<template-id>",
       "invite_subject":"Please sign your Acme onboarding form",
       "invite_message":"Thanks for joining — just one form to go.",
       "signer":{"email":"jane@acme.com"}}'`}
                    </pre>
                    <p className="mt-3 font-medium text-slate-900">List documents &amp; templates</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl "https://signedby.ai/api/v1/documents?status=completed&limit=20" \\
  -H "Authorization: Bearer sb_live_..."
curl https://signedby.ai/api/v1/templates \\
  -H "Authorization: Bearer sb_live_..."`}
                    </pre>
                    <p className="mt-3 font-medium text-slate-900">Download the signed PDF, or void a document</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
{`curl https://signedby.ai/api/v1/documents/<document-id>/signed-file \\
  -H "Authorization: Bearer sb_live_..." -o signed.pdf
curl -X POST https://signedby.ai/api/v1/documents/<document-id>/void \\
  -H "Authorization: Bearer sb_live_..."`}
                    </pre>
                  </div>
                </Collapsible>

                {/* Webhooks stay gated to Pro/Team/Business — not part of the
                    Free-sandbox decision (API_TIER_SCOPE.md). A Free org
                    sees a plain gate line instead, same style as the
                    Workspace card's own gate line, linking to the public
                    docs (PUBLIC_API_DOCS_SCOPE.md) rather than dead-ending. */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-900">Webhooks</p>
                  {hasAnyApiAccess ? (
                    <>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Get notified the moment a document is viewed, signed, completed, or declined — e.g. attach
                        the signed PDF to a CRM deal via Make.
                      </p>
                      <div className="mt-3">
                        <WebhookSettings />
                      </div>
                    </>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Webhooks are available on the Pro plan or higher.{" "}
                      <Link href="/developers" className="font-medium text-slate-700 underline hover:text-slate-900">
                        See what&apos;s possible in the docs
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
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
