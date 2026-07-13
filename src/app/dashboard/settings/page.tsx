import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BrandingSettings } from "@/components/branding-settings";
import { ApiKeySettings } from "@/components/api-key-settings";
import { AutoSuggestSettings } from "@/components/auto-suggest-settings";

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Workspace branding, AI suggestions, and API access.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI field suggestions</CardTitle>
            <CardDescription>Controls when AI-suggested field placements run for new documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <AutoSuggestSettings initialEnabled={org.auto_suggest_on_upload} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              {hasCustomBranding
                ? "Your logo and brand color appear on the signing page instead of the default SignedBy footer."
                : "Your workspace name replaces the default SignedBy footer on the signing page (Team plan)."}
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
            {!hasCustomBranding && (
              <div className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-center">
                <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
                  Upgrade to Business
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API access</CardTitle>
            <CardDescription>
              {hasApiAccess
                ? "Use this key to create and send documents from your own systems."
                : "Programmatic access to SignedBy is available on the Business plan."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasApiAccess ? (
              <div className="space-y-4">
                <ApiKeySettings apiKeyPrefix={org.api_key_prefix} />
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
              <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
                Upgrade to Business
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
