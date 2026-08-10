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
import { IdentitySettings } from "@/components/identity-settings";
import { BadgePlacementSettings } from "@/components/badge-placement-settings";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Collapsible } from "@/components/collapsible";
import { resolveIdentityStatus } from "@/lib/identity";

// Grouped by concern, not by tier: Workspace → Identity → Automation & AI →
// Integrations → Plan & team. Plan/seat management actually lives on separate
// pages (/dashboard/billing, /dashboard/team), so the last card is a signpost
// to them — people look for those here first.
export default async function SettingsPage() {
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "name, plan, logo_url, brand_color, api_key_prefix, auto_suggest_on_upload, identity_verified_at, identity_verified_name, badge_placement_mode, last_badge_page, last_badge_x, last_badge_y, last_badge_width"
    )
    .eq("id", orgId)
    .single();

  if (!org) redirect("/dashboard");

  // Same computation console/app/page.tsx already does for its own copy of
  // this data (2026-08-05 follow-up to VERIFIED_BADGE_DASHBOARD_SCOPE.md) —
  // one org-level identity check, two rendering surfaces. No certificate-
  // mode read here anymore (removed same day) — the dashboard's own seal
  // route hardcodes "both" now, so there's no preference left to fetch.
  const identityStatus = resolveIdentityStatus(org);

  // Advanced "badge position for API users" block (2026-08-10, direct ask)
  // — a read-only preview of organizations.last_badge_* in exactly the
  // shape V2.1's own explicit-coordinates option is already scoped to
  // accept (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md), so it's a direct
  // copy-paste into that endpoint whenever it ships, not something an
  // integrator has to translate. Null until an org has saved a Badge
  // Placer position at least once (via "Ask me every time" or the
  // Business payment-link screen) — nothing to show before then.
  const hasBadgePosition =
    org.last_badge_page != null && org.last_badge_x != null && org.last_badge_y != null && org.last_badge_width != null;
  const badgePositionJson = hasBadgePosition
    ? JSON.stringify(
        { page: org.last_badge_page, x: org.last_badge_x, y: org.last_badge_y, width: org.last_badge_width },
        null,
        2
      )
    : null;

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
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              {/* 2026-08-05 follow-up to VERIFIED_BADGE_DASHBOARD_SCOPE.md —
                  this card didn't exist here before (a direct question:
                  "not seeing anything in Settings under Identity, is it
                  there but I'm missing it?"). It wasn't: the same panel only
                  lived in Console's Settings tab, moved there 2026-08-01
                  back when sealing was Console/MCP-only. Kept as a second
                  surface over the same data now that both exist, not a
                  replacement — see identity-settings.tsx's doc comment. Also
                  the intended home for a future LinkedIn-based identity
                  signal, per direct note. */}
              One-time identity check, required before your first Verified Badge seal — reused across every future
              seal after that, from this dashboard, Console, or the API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IdentitySettings
              identityVerified={identityStatus.verified}
              identityVerifiedName={identityStatus.verified ? identityStatus.name : null}
              identityVerifiedAt={identityStatus.verified ? identityStatus.verifiedAt : null}
              identityStale={identityStatus.verified ? identityStatus.stale : false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verified Badge</CardTitle>
            <CardDescription>
              {/* New card, 2026-08-10 (IN_DOCUMENT_BADGE_AND_API_SEAL_
                  SCOPE.md V1.1) — sibling to Identity, not folded into it
                  (that card stays scoped to identity verification only).
                  Dashboard-only: Console/MCP sealing has no UI to place a
                  badge in, so this setting only affects seals started from
                  this dashboard's Seal a file tab. */}
              Whether sealing a document from this dashboard stamps the badge straight into a corner of the file
              itself — and if so, whether you get to choose exactly where.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BadgePlacementSettings initialMode={org.badge_placement_mode === "ask" ? "ask" : "skip"} />
            {hasBadgePosition && (
              <div className="border-t border-slate-100 pt-4">
                <Collapsible label="Advanced: badge position for API users">
                  <p className="text-xs text-slate-500">
                    Your most recently saved badge position, in the shape the future sealing API will accept as an
                    explicit placement input. Not usable yet — the API endpoint itself hasn&apos;t shipped — but
                    worth having on hand for when it does.
                  </p>
                  <div className="mt-2 rounded-md bg-slate-50 p-3">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-600">
                      {badgePositionJson}
                    </pre>
                  </div>
                  <div className="mt-2">
                    <CopyLinkButton value={badgePositionJson ?? ""} label="Copy JSON" />
                  </div>
                </Collapsible>
              </div>
            )}
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
                  ? "Metered API access — 100 free document-sends a month, then billed per document. Use the key below to create, send, and track documents from your own code."
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
