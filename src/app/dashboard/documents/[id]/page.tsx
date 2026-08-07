import Link from "next/link";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestCurrency } from "@/lib/currency.server";
import { FieldEditor } from "@/components/field-editor";
import { VoidDocumentButton } from "@/components/void-document-button";
import { SignerRow } from "@/components/signer-row";
import { AuditTrail, type AuditEvent } from "@/components/audit-trail";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ShareLinkButton } from "@/components/share-link-button";
import { QrLinkButton } from "@/components/qr-link-button";
import { OutputHint } from "@/components/output-hint";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planHasFeature, getFreePlanUsage } from "@/lib/plan";
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
      "id, org_id, title, page_count, status, signed_file_path, is_verified_badge, certificate_file_path, certificate_mode, payment_link_url, payment_label, docgate_url, docgate_label, open_notifications, recipient_notice, invite_subject, invite_message, expires_at, organizations(plan, auto_suggest_on_upload)"
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
      .select("id, event_type, created_at, metadata, signer_id, document_hash, signers(name, email)")
      .eq("document_id", id)
      .order("created_at", { ascending: true });

    // The real hash-bearing verify link for this document, not the generic
    // /verify search form (CERTIFICATE_VISIBILITY_PROMOTION_SCOPE.md,
    // 2026-08-04) — same "completed" event other routes (badge, console
    // verified-badge list) already read document_hash off of.
    const completedHash = (auditEvents || []).find((e) => e.event_type === "completed")?.document_hash ?? null;
    // Absolute, shareable form of the same link — matches console-verified-
    // badge-list.tsx's own verifyUrl (2026-08-05 follow-up to
    // VERIFIED_BADGE_DASHBOARD_SCOPE.md): a sealed document's verify link is
    // meant to be copied and handed to a client, so it needs the full host,
    // not a relative path.
    const verifyUrl = completedHash ? `https://signedby.ai/verify?hash=${completedHash}` : null;

    // A sealed document's history is noisier than it needs to be: the
    // self-sign primitive (VERIFIED_BADGE_SCOPE.md's decision 6) fires the
    // same sent/consent_given/signed events a real multi-party completion
    // would, which read as meaningless for a document you sealed to
    // yourself. Worse, `POST /api/documents` (the finalize step every
    // upload path — including the dashboard's own seal flow — already goes
    // through) logs its own "created" event, and `sealDocumentAction` logs
    // a second one on top of that when the seal happens moments later — a
    // genuine duplicate, not two different facts. For a sealed doc, keep
    // only the earliest "created" (the real upload moment) and "completed"
    // (the actual seal moment) — see AuditTrail's isVerifiedBadge prop for
    // how those two get relabeled "Document uploaded"/"Sealed with a
    // Verified Badge".
    const historyEvents = doc.is_verified_badge
      ? ([
          [...(auditEvents || [])]
            .filter((e) => e.event_type === "created")
            .sort((a, b) => a.created_at.localeCompare(b.created_at))[0],
          (auditEvents || []).find((e) => e.event_type === "completed"),
        ].filter(Boolean) as NonNullable<typeof auditEvents>)
      : auditEvents || [];

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
              {/* "Sealed" instead of "Completed" for a Verified Badge
                  document (2026-08-05 follow-up to
                  VERIFIED_BADGE_DASHBOARD_SCOPE.md, direct ask) — the pill
                  used to say "Completed" here (and "Signed" on the signer
                  row below) either way, which reads as "you signed a
                  contract with yourself" for a self-sealed document, since
                  the self-sign primitive reuses the ordinary
                  documents/signers schema unmodified (VERIFIED_BADGE_
                  SCOPE.md's decision 6). Same green tone/check mark either
                  way — this is a label fix, not a new state. */}
              <StatusPill tone="green" label={doc.is_verified_badge ? "Sealed" : "Completed"} icon="check" />
              {doc.is_verified_badge ? (
                <span className="text-sm text-slate-500">Sealed with a Verified Badge.</span>
              ) : (
                <span className="text-sm text-slate-500">Every signer has signed.</span>
              )}
            </div>
            {/* "Last viewed"/live-viewing status has no meaning for a
                document you sealed to yourself — there's no other party who
                could be viewing it. Skipped for Verified Badge documents
                rather than showing a permanently-empty line. */}
            {!doc.is_verified_badge && (
              <p className="mt-1">
                <LiveViewedStatus documentId={id} initialLastViewedAt={lastViewedAt} live={hasPageViewTracking} />
              </p>
            )}
            {/* Short form of the same Document ID the Certificate of
                Completion prints in full; /verify is the public hash-lookup
                that proves the signed copy is genuine (V3 item #5). Links to
                this document's own hash-bearing entry rather than the
                generic search form now that completedHash is available
                (CERTIFICATE_VISIBILITY_PROMOTION_SCOPE.md, 2026-08-04) — a
                one-click proof link, not just a pointer to go search for it. */}
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-mono">#{doc.id.slice(0, 8)}</span> &middot; anyone can verify this document at{" "}
              <Link href={completedHash ? `/verify?hash=${completedHash}` : "/verify"} className="underline hover:text-slate-600">
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

          {/* Certificate/verify QR preview (CERTIFICATE_VISIBILITY_
              PROMOTION_SCOPE.md, 2026-08-04) — direct feedback: "people did
              not know they had a certificate of completion added to the
              document... most people are impressed by the certificate but
              never see it." The certificate page already exists baked into
              the signed PDF (generate-signed-pdf.ts); this is the same QR,
              just made visible without opening the PDF. Placed first, ahead
              of Signers, since the completion email's own CTA already sends
              people to this exact page — this is the highest-traffic spot
              to fix the "never see it" gap. Every plan, no gating — a trust
              signal, not a premium feature. */}
          {completedHash && (
            <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated by
                  /api/certificate-qr (next/og ImageResponse), not a static asset */}
              <img
                src={`/api/certificate-qr?hash=${completedHash}`}
                alt="Scan to verify this document"
                width={300}
                height={130}
                className="h-auto w-40 shrink-0 rounded border border-slate-200"
              />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">This document is certified</h2>
                <p className="mt-1 text-sm text-slate-600">
                  A tamper-evident Certificate of Completion was added to the signed PDF, with a SHA-512 hash anyone can
                  check against the original.
                </p>
                <Link href={`/verify?hash=${completedHash}`} className="mt-2 inline-block text-sm underline hover:text-slate-900">
                  Verify this document
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            {/* "Sealed by" instead of "Signers" for a Verified Badge
                document (2026-08-05 follow-up) — there's exactly one row
                here (the self-sign primitive addresses the document to the
                org itself), so "Signers" plural reads oddly, and "Signed"
                on that row has the same "signed a contract with myself"
                problem the top pill had. */}
            <h2 className="text-sm font-semibold text-slate-900">{doc.is_verified_badge ? "Sealed by" : "Signers"}</h2>
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
                      {/* Engagement tracking (page views/dwell time) has
                          nothing to show or upsell for a self-seal — there's
                          no other party whose reading behavior would be
                          worth tracking. */}
                      {!doc.is_verified_badge && engagementLabel && (
                        <span className="ml-2 text-xs text-slate-400">· {engagementLabel}</span>
                      )}
                      {!doc.is_verified_badge && !hasPageViewTracking && (
                        <Link href="/pricing" className="ml-2 text-xs text-slate-400 hover:text-slate-600">
                          · Engagement tracking (Pro+)
                        </Link>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <StatusPill tone="green" label={doc.is_verified_badge ? "Sealed" : "Signed"} />
                      {s.signed_at && (
                        <span className="text-xs text-slate-400">{new Date(s.signed_at).toLocaleDateString()}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {doc.is_verified_badge ? (
                // Console-parity output row (2026-08-05 follow-up to
                // VERIFIED_BADGE_DASHBOARD_SCOPE.md) — same five outputs,
                // same order, same icons as console-chat.tsx's own
                // `m.sealed` block (~line 1479) and console-verified-badge-
                // list.tsx, just light-themed for the dashboard instead of
                // Console's dark chat surface. This is the dashboard's only
                // "Badge image" link — it didn't exist here before.
                <>
                  {verifyUrl && (
                    <>
                      <CopyLinkButton value={verifyUrl} label="Copy verify link" />
                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Open verify page
                      </a>
                      {/* Same "get this link onto a phone" pair added to
                          signer-row.tsx (2026-08-07) -- a freelancer who just
                          sealed a Verified Badge document is exactly as
                          likely to want to text/WhatsApp/AirDrop this link
                          to a client, or show them a QR to scan in person,
                          as a signer is to receive a signing link that way. */}
                      <ShareLinkButton
                        link={verifyUrl}
                        shareText={`Here's the verification link for "${doc.title}":`}
                        label="Share verify link"
                      />
                      <QrLinkButton
                        link={verifyUrl}
                        caption="Their camera opens this document's verification page."
                      />
                    </>
                  )}
                  {/* certificate_mode "separate" never produces a
                      signed_file_path — the original stays byte-for-byte
                      untouched by design (VERIFIED_BADGE_SCOPE.md's
                      "byte-for-byte untouched") — so this button is simply
                      omitted rather than shown as permanently pending. */}
                  {doc.signed_file_path && doc.certificate_mode !== "separate" && (
                    <a
                      href={`/api/documents/${id}/signed-file`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Sealed PDF
                    </a>
                  )}
                  {doc.certificate_file_path && (
                    // One-time "best for X" education (2026-08-06,
                    // IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md section 4c) --
                    // no document-type detection, same static-hint call as
                    // the placement decision above.
                    <OutputHint
                      storageKey="sb_output_hint_certificate_seen"
                      hint="Best for datarooms — keeps your original file completely untouched, with proof filed separately."
                    >
                      <a
                        href={`/api/documents/${id}/certificate`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Certificate
                      </a>
                    </OutputHint>
                  )}
                  <OutputHint
                    storageKey="sb_output_hint_badge_seen"
                    hint="Best for invoices — a clean mark you can drop straight into it, nothing else to manage."
                  >
                    <a
                      href={`/api/documents/${id}/badge`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Badge image
                    </a>
                  </OutputHint>
                  <a
                    href={`/api/documents/${id}/original-file`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Download original (unsigned)
                  </a>
                  <DuplicateDocumentButton documentId={id} />
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Document history</h2>
            <div className="mt-4">
              <AuditTrail events={historyEvents as unknown as AuditEvent[]} isVerifiedBadge={doc.is_verified_badge} />
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
                  documentTitle={doc.title}
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

  // Read-only "would Send actually be blocked?" check (2026-08-05, direct
  // ask), same reasoning/staleness tradeoff as new-document-client.tsx's
  // sendCapReached prop — this only reaches here for a draft (see the
  // "completed"/"sent" branches above, both of which return earlier), so a
  // Free org that's already used its 3 sends this month sees the Upgrade
  // card the moment they open this draft's editor and hit Send, not a
  // generic error after the request round-trips.
  let sendCapReached = false;
  if ((orgPlan ?? "free") === "free") {
    const usage = await getFreePlanUsage(supabase, doc.org_id);
    sendCapReached = usage.sendsUsedThisMonth >= 3 && usage.docCredits <= 0;
  }
  const currency = await getRequestCurrency();

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
      sendCapReached={sendCapReached}
      currency={currency}
    />
  );
}
