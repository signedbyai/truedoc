import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FieldEditor } from "@/components/field-editor";
import { VoidDocumentButton } from "@/components/void-document-button";
import { SignerRow } from "@/components/signer-row";
import { AuditTrail, type AuditEvent } from "@/components/audit-trail";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { buttonVariants } from "@/components/ui/button";
import { planHasFeature } from "@/lib/plan";
import { formatEngagement } from "@/lib/page-view-tracking";

export default async function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, title, page_count, status, signed_file_path, payment_link_url, payment_label, docgate_url, docgate_label, organizations(plan, auto_suggest_on_upload)"
    )
    .eq("id", id)
    .single();

  if (!doc) notFound();

  const orgData = doc.organizations as unknown as
    | { plan?: string; auto_suggest_on_upload?: boolean }
    | { plan?: string; auto_suggest_on_upload?: boolean }[]
    | undefined;
  const orgRecord = Array.isArray(orgData) ? orgData[0] : orgData;
  const orgPlan = orgRecord?.plan;
  const hasPaymentCollection = planHasFeature(orgPlan, "paymentCollection");
  const hasDocGate = planHasFeature(orgPlan, "docGate");
  const hasTemplates = planHasFeature(orgPlan, "templates");
  const hasReminders = planHasFeature(orgPlan, "reminders");
  const hasPageViewTracking = planHasFeature(orgPlan, "pageViewTracking");
  // Column defaults to false; ?? false covers the (should-never-happen)
  // case of it coming back undefined.
  const autoSuggestOnUpload = orgRecord?.auto_suggest_on_upload ?? false;

  // Per-signer engagement summary (Starter+ only -- see plan.ts). Kept as a
  // plain signer_id -> summary map so both the "completed" and "sent"
  // branches below can look a signer up the same way regardless of which
  // signer-list shape they render.
  const engagementBySigner = new Map<string, { totalSeconds: number; pagesViewed: number }>();
  if (hasPageViewTracking) {
    const { data: pageViews } = await supabase
      .from("document_page_views")
      .select("signer_id, seconds_viewed")
      .eq("document_id", id);
    for (const row of pageViews || []) {
      const existing = engagementBySigner.get(row.signer_id) ?? { totalSeconds: 0, pagesViewed: 0 };
      existing.totalSeconds += row.seconds_viewed;
      existing.pagesViewed += 1;
      engagementBySigner.set(row.signer_id, existing);
    }
  }

  if (doc.status === "completed") {
    const { data: signers } = await supabase
      .from("signers")
      .select("id, name, email, signed_at")
      .eq("document_id", id)
      .order("order_index", { ascending: true });

    const { data: auditEvents } = await supabase
      .from("audit_events")
      .select("id, event_type, created_at, metadata, signer_id, signers(name, email)")
      .eq("document_id", id)
      .order("created_at", { ascending: true });

    // DocGate summary line (see src/app/g/[code]/route.ts for where
    // docgate_clicked events are logged): a signer can click their link more
    // than once, so this counts distinct signers who have clicked at least
    // once,
    // not total clicks — "2 of 3 signers have accessed" is the question a
    // sender actually has, not "there were 5 click events." Shown
    // unconditionally once a gate link is set, regardless of the org's
    // *current* plan — this is a read of what already happened, not an
    // upsell surface, so a later downgrade shouldn't hide real history
    // (unlike the signer-facing Pay/gate buttons, which do check current
    // plan — see sign/[token]/page.tsx).
    const docgateClickedSignerIds = new Set(
      (auditEvents || []).filter((e) => e.event_type === "docgate_clicked" && e.signer_id).map((e) => e.signer_id)
    );

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <Link href="/dashboard/documents" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Documents
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <p className="text-sm text-emerald-600">Completed — every signer has signed.</p>
            {doc.docgate_url && (
              <p className="mt-1 text-sm text-amber-700">
                {docgateClickedSignerIds.size} of {(signers || []).length} signer
                {(signers || []).length === 1 ? "" : "s"} {docgateClickedSignerIds.size === 1 ? "has" : "have"}{" "}
                accessed the linked file
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Signers</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(signers || []).map((s) => {
                const engagement = engagementBySigner.get(s.id);
                const engagementLabel = engagement ? formatEngagement(engagement.totalSeconds, engagement.pagesViewed) : null;
                // Every signer here has already signed (doc.status ===
                // "completed"), so there's always something real to tease --
                // no status gating needed, unlike the "sent" branch below.
                return (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>
                      {s.name ? `${s.name} <${s.email}>` : s.email}
                      {engagementLabel && <span className="ml-2 text-xs text-slate-400">· {engagementLabel}</span>}
                      {!hasPageViewTracking && (
                        <Link href="/pricing" className="ml-2 text-xs text-slate-400 hover:text-slate-600">
                          · Engagement tracking (Starter+)
                        </Link>
                      )}
                    </span>
                    <span className="text-xs text-slate-500">
                      {s.signed_at ? new Date(s.signed_at).toLocaleString() : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <a href={`/api/documents/${id}/signed-file`} className={buttonVariants({ size: "sm" })}>
                {doc.signed_file_path ? "Download signed PDF" : "Signed PDF pending…"}
              </a>
              <a
                href={`/api/documents/${id}/original-file`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Download original (unsigned)
              </a>
              <DuplicateDocumentButton documentId={id} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Document history</h2>
            <div className="mt-4">
              <AuditTrail events={(auditEvents || []) as unknown as AuditEvent[]} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (doc.status === "sent" || doc.status === "declined" || doc.status === "voided") {
    const { data: signers } = await supabase
      .from("signers")
      .select("id, name, email, status, signed_at, signing_token")
      .eq("document_id", id)
      .order("order_index", { ascending: true });

    const { data: auditEvents } = await supabase
      .from("audit_events")
      .select("id, event_type, created_at, metadata, signers(name, email)")
      .eq("document_id", id)
      .order("created_at", { ascending: true });

    const statusCopy: Record<string, { label: string; className: string }> = {
      sent: { label: "Out for signature", className: "text-blue-600" },
      declined: { label: "Declined by a signer", className: "text-red-600" },
      voided: { label: "Voided", className: "text-slate-500" },
    };
    const { label, className } = statusCopy[doc.status];

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <Link href="/dashboard/documents" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Documents
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <p className={`text-sm ${className}`}>{label}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={`/api/documents/${id}/original-file`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Download original (unsigned)
              </a>
              <DuplicateDocumentButton documentId={id} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Signers</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(signers || []).map((s) => (
                <SignerRow
                  key={s.id}
                  documentId={id}
                  signer={s}
                  docStatus={doc.status}
                  hasReminders={hasReminders}
                  hasPageViewTracking={hasPageViewTracking}
                  engagement={engagementBySigner.get(s.id) ?? null}
                />
              ))}
            </ul>

            {doc.status === "sent" && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <VoidDocumentButton documentId={id} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Document history</h2>
            <div className="mt-4">
              <AuditTrail events={(auditEvents || []) as unknown as AuditEvent[]} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <FieldEditor
      documentId={doc.id}
      pageCount={doc.page_count}
      hasPaymentCollection={hasPaymentCollection}
      hasDocGate={hasDocGate}
      hasTemplates={hasTemplates}
      autoSuggestOnUpload={autoSuggestOnUpload}
      initialPaymentLinkUrl={doc.payment_link_url}
      initialPaymentLabel={doc.payment_label}
      initialDocgateUrl={doc.docgate_url}
      initialDocgateLabel={doc.docgate_label}
    />
  );
}
