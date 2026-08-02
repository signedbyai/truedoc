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
import { latestTimestamp } from "@/lib/last-viewed";
import { LiveViewedStatus } from "@/components/live-viewed-status";
import { OpenNotificationsToggle } from "@/components/open-notifications-toggle";
import { StatusPill, DOCUMENT_STATUS_PILL } from "@/components/status-pill";

export default async function DocumentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // Set only on the redirect from Magic Quote's finalize step when the
  // sender typed a Bill To email (see magic-quote-form.tsx's
  // handleFinalize) — passed straight through to FieldEditor, which only
  // acts on them when an email is present. Absent for every other path
  // into this page (upload, AI Drafter, duplicate, template).
  //
  // from=console (2026-08-02, direct ask) — set only on the "Review fields"
  // link console-chat.tsx's handleTemplateFileSelected sends a multi-party
  // upload to (see that file's reviewLink). Threaded through to
  // FieldEditor's cameFromConsole prop, which shows a couple of
  // Console-specific hints; absent (and inert) for every other path in.
  //
  // c=<conversationId> (2026-08-02, TEMPLATE_BROWSE_SCOPE.md) — rides
  // alongside from=console on the same links, carrying which console
  // conversation the user actually came from. Threaded through to
  // FieldEditor's consoleConversationId prop so its "Back to Console"
  // button can reopen that exact conversation instead of a blank one —
  // see console-workspace.tsx's handling of /console/app?c=.
  //
  // consoleTemplatePreview=1 (2026-08-02, TEMPLATE_BROWSE_SCOPE.md Option
  // A) — set only by console-templates-list.tsx's "click a template"
  // action, which spawns this draft purely so its fields are visible in
  // the editor, not because the user meant to create a new document.
  // Threaded through to FieldEditor's isConsoleTemplatePreview prop, which
  // auto-discards the draft on Back to Console instead of leaving it as
  // clutter in Documents.
  searchParams: Promise<{ signerName?: string; signerEmail?: string; from?: string; c?: string; consoleTemplatePreview?: string }>;
}) {
  const { id } = await params;
  const { signerName, signerEmail, from, c, consoleTemplatePreview } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, title, page_count, status, signed_file_path, payment_link_url, payment_label, docgate_url, docgate_label, open_notifications, recipient_notice, invite_subject, invite_message, expires_at, organizations(plan, auto_suggest_on_upload)"
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
  // case of it coming back undefined. Available on every plan.
  const autoSuggestOnUpload = orgRecord?.auto_suggest_on_upload ?? false;

  // Per-signer engagement summary (Pro+ only -- see plan.ts). Kept as a
  // plain signer_id -> summary map so both the "completed" and "sent"
  // branches below can look a signer up the same way regardless of which
  // signer-list shape they render.
  const engagementBySigner = new Map<string, { totalSeconds: number; pagesViewed: number }>();
  // Freshest engagement-tracker timestamp across all signers/pages — one
  // input to the "Last viewed Xm ago" line below (see src/lib/last-viewed.ts
  // for the two-source merge with audit "viewed" events).
  let lastPageViewAt: string | null = null;
  if (hasPageViewTracking) {
    const { data: pageViews } = await supabase
      .from("document_page_views")
      .select("signer_id, seconds_viewed, last_viewed_at")
      .eq("document_id", id);
    for (const row of pageViews || []) {
      const existing = engagementBySigner.get(row.signer_id) ?? { totalSeconds: 0, pagesViewed: 0 };
      existing.totalSeconds += row.seconds_viewed;
      existing.pagesViewed += 1;
      engagementBySigner.set(row.signer_id, existing);
      lastPageViewAt = latestTimestamp([lastPageViewAt, row.last_viewed_at]);
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

    const lastViewedAt = latestTimestamp([
      lastPageViewAt,
      ...(auditEvents || []).filter((e) => e.event_type === "viewed").map((e) => e.created_at),
    ]);

    return (
      <main className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <nav className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/dashboard" className="font-medium hover:text-slate-700">
                Dashboard
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/dashboard/documents" className="font-medium hover:text-slate-700">
                Documents
              </Link>
            </nav>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusPill tone="green" label="Completed" icon="check" />
              <span className="text-sm text-slate-500">Every signer has signed.</span>
            </div>
            <p className="mt-1">
              <LiveViewedStatus documentId={id} initialLastViewedAt={lastViewedAt} live={hasPageViewTracking} />
            </p>
            {/* Short form of the same Document ID the Certificate of
                Completion prints in full; /verify is the public hash-lookup
                that proves the signed copy is genuine (V3 item #5). */}
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-mono">#{doc.id.slice(0, 8)}</span> &middot; anyone can verify this document at{" "}
              <Link href="/verify" className="underline hover:text-slate-600">
                signedby.ai/verify
              </Link>
            </p>
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
                          · Engagement tracking (Pro+)
                        </Link>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <StatusPill tone="green" label="Signed" />
                      {s.signed_at && (
                        <span className="text-xs text-slate-400">{new Date(s.signed_at).toLocaleDateString()}</span>
                      )}
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
      .select("id, name, email, status, signed_at, signing_token, last_email_event")
      .eq("document_id", id)
      .order("order_index", { ascending: true });

    const { data: auditEvents } = await supabase
      .from("audit_events")
      .select("id, event_type, created_at, metadata, signers(name, email)")
      .eq("document_id", id)
      .order("created_at", { ascending: true });

    const docPill = DOCUMENT_STATUS_PILL[doc.status];

    const lastViewedAt = latestTimestamp([
      lastPageViewAt,
      ...(auditEvents || []).filter((e) => e.event_type === "viewed").map((e) => e.created_at),
    ]);

    return (
      <main className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <nav className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/dashboard" className="font-medium hover:text-slate-700">
                Dashboard
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/dashboard/documents" className="font-medium hover:text-slate-700">
                Documents
              </Link>
            </nav>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <div className="mt-1.5">
              {docPill ? (
                <StatusPill tone={docPill.tone} label={docPill.label} pulse={docPill.pulse} />
              ) : (
                <span className="text-sm text-slate-500">{doc.status}</span>
              )}
            </div>
            {/* Live pill: on a "sent" doc this is the money moment — the
                sender watching "Last viewed 2m ago" flip to "Viewing now"
                while their signer reads. */}
            <p className="mt-1">
              <LiveViewedStatus documentId={id} initialLastViewedAt={lastViewedAt} live={hasPageViewTracking} />
            </p>
            {/* No /verify link here — verification hashes the SIGNED copy,
                which doesn't exist until the document completes. */}
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-mono">#{doc.id.slice(0, 8)}</span>
            </p>
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
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4">
                <OpenNotificationsToggle documentId={id} initialEnabled={doc.open_notifications ?? true} />
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
      documentTitle={doc.title}
      pageCount={doc.page_count}
      hasPaymentCollection={hasPaymentCollection}
      hasDocGate={hasDocGate}
      hasTemplates={hasTemplates}
      hasPageViewTracking={hasPageViewTracking}
      autoSuggestOnUpload={autoSuggestOnUpload}
      initialPaymentLinkUrl={doc.payment_link_url}
      initialPaymentLabel={doc.payment_label}
      initialDocgateUrl={doc.docgate_url}
      initialDocgateLabel={doc.docgate_label}
      initialRecipientNotice={doc.recipient_notice}
      initialInviteSubject={doc.invite_subject}
      initialInviteMessage={doc.invite_message}
      initialExpiresAt={doc.expires_at}
      initialSignerName={signerName}
      initialSignerEmail={signerEmail}
      cameFromConsole={from === "console"}
      consoleConversationId={from === "console" ? c ?? null : null}
      isConsoleTemplatePreview={from === "console" && consoleTemplatePreview === "1"}
    />
  );
}
