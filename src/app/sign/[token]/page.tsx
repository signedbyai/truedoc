import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getSignerByToken } from "@/lib/signing";
import { sendSignerOpenedEmail } from "@/lib/email";
import { SigningView } from "@/components/signing-view";
import { planHasFeature } from "@/lib/plan";
import { visibleFieldsForSigner } from "@/lib/field-visibility";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) notFound();
  const { admin, signer, document } = result;

  // Fetched early (not just in the main signing-flow branch below) because
  // the dead-end status screens (already signed/declined/voided) need it
  // too, to decide whether to show the "create your own account" growth CTA
  // — see StatusScreen's comment for why that's conditional on plan. Reused
  // below for the full signing view's branding object too, so this only
  // runs once per request either way.
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan, logo_url, brand_color")
    .eq("id", document.org_id)
    .single();
  const orgHasBranding = planHasFeature(org?.plan, "branding");
  // Same white-label logic as showGrowthCta, in the positive direction: the
  // org's logo tops the dead-end screens (already signed / declined /
  // voided) instead of an unbranded card. Gated on customBranding (Business,
  // logo+color) — NOT the wider `branding` (Team, name-only) — to match the
  // signing header's `hasCustomBranding && hasLogo` gate exactly. Same
  // /api/org/…/logo route, so caching/busting behavior is shared.
  const statusLogo = planHasFeature(org?.plan, "customBranding") && org?.logo_url
    ? { url: `/api/org/${document.org_id}/logo`, alt: org?.name || "Sender logo" }
    : undefined;

  // Gated on the org's *current* plan, not just whether the field is set —
  // same reasoning as `payment` below. Uses a relative /g/[code] path (not
  // an absolute URL) since it's only ever rendered as an <a href> here or in
  // the signer-facing email (which builds its own absolute link).
  const docgate =
    document.docgate_url && planHasFeature(org?.plan, "docGate")
      ? { path: `/g/${signer.docgate_code}`, label: document.docgate_label }
      : null;

  if (signer.status === "signed") {
    // Previously this branch was 100% static regardless of what happened
    // after this signer finished — a signer revisiting their own link after
    // every co-signer has since completed the document never saw anything
    // change. Now, if the document has since become fully completed and a
    // DocGate link is set, this "revisit later" case gets the same gate CTA
    // the completing signer sees immediately on their own confirmation
    // screen (signing-view.tsx) — the other half of the whole-document
    // gating decision.
    const gateReady = document.status === "completed" && docgate;
    return (
      <StatusScreen
        title="Already signed"
        message={`You signed "${document.title}" on ${signer.signed_at ? new Date(signer.signed_at).toLocaleDateString() : "record"}. No further action is needed.`}
        showGrowthCta={!orgHasBranding}
        logo={statusLogo}
      >
        {gateReady && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left">
            {/* Fixed sentence up top, custom label only on the button —
                using the label for both printed it twice back to back
                (e.g. "Access to dataroom" heading + "Access to dataroom"
                button). */}
            <p className="text-xs text-amber-900">Everyone has signed — your access link is ready.</p>
            {/* Same yellow-highlighter treatment as the field editor's
                Signature button (.next-step-highlight in globals.css) —
                white button, dark label, yellow sweep — so the gate link
                reads as THE next action on this screen. */}
            <a
              href={docgate.path}
              className="mt-2 inline-block rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <span className="next-step-highlight">{docgate.label || "Open link"}</span>
            </a>
          </div>
        )}
      </StatusScreen>
    );
  }

  if (signer.status === "declined") {
    return (
      <StatusScreen
        title="Signing declined"
        message={`You declined to sign "${document.title}".`}
        showGrowthCta={!orgHasBranding}
        logo={statusLogo}
      />
    );
  }

  if (document.status === "declined") {
    return (
      <StatusScreen
        title="Document declined"
        message={`Signing was declined by another party, so "${document.title}" is no longer awaiting your signature.`}
        showGrowthCta={!orgHasBranding}
        logo={statusLogo}
      />
    );
  }

  if (document.status === "voided") {
    return (
      <StatusScreen
        title="No longer available"
        message="This document has been voided by the sender."
        showGrowthCta={!orgHasBranding}
        logo={statusLogo}
      />
    );
  }

  // Mark viewed the first time this link is opened.
  if (signer.status === "pending" || signer.status === "sent") {
    await admin.from("signers").update({ status: "viewed" }).eq("id", signer.id);
    await admin.from("audit_events").insert({
      document_id: document.id,
      signer_id: signer.id,
      event_type: "viewed",
    });

    // "Signer just opened your document" sender email (V3 #8). Guaranteed
    // at-most-once per signer by the pending/sent gate above. Inside
    // `after()` so the signer's first page load — the most latency-critical
    // render in the product — never waits on a Resend round-trip. Skipped
    // when the sender opens their own signing link (self-sign tests) and
    // when the document's per-doc mute is off.
    if (document.open_notifications) {
      after(async () => {
        try {
          const { data: ownerData } = await admin.auth.admin.getUserById(document.owner_id);
          const ownerEmail = ownerData?.user?.email;
          if (!ownerEmail || ownerEmail.toLowerCase() === signer.email.toLowerCase()) return;
          await sendSignerOpenedEmail({
            to: ownerEmail,
            signerName: signer.name,
            signerEmail: signer.email,
            documentTitle: document.title,
            documentId: document.id,
          });
        } catch (err) {
          console.error("Signer-opened email failed", err);
        }
      });
    }
  }

  const { data: fields } = await admin
    .from("document_fields")
    .select("id, type, page, x, y, width, height, value, required, signer_id, template_role, purpose")
    .eq("document_id", document.id)
    .order("created_at", { ascending: true });

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id);

  // Shared visibility rule (same as the submit route and send guard) so the
  // page can't drift from what's actually validated — previously this was an
  // inline copy that didn't account for template_role.
  const visibleFields = visibleFieldsForSigner(fields || [], signer.id, signerCount ?? 0);

  const branding = {
    orgId: document.org_id,
    orgName: org?.name || "SignedBy",
    hasBranding: orgHasBranding,
    hasCustomBranding: planHasFeature(org?.plan, "customBranding"),
    hasLogo: Boolean(org?.logo_url),
    brandColor: org?.brand_color || null,
  };

  // Gated on the org's *current* plan, not just whether the field is set —
  // a downgrade after the document was sent shouldn't keep showing a Pay
  // button. See src/lib/plan.ts.
  const payment =
    document.payment_link_url && planHasFeature(org?.plan, "paymentCollection")
      ? { url: document.payment_link_url, label: document.payment_label }
      : null;

  return (
    <SigningView
      token={token}
      documentTitle={document.title}
      pageCount={document.page_count}
      signerName={signer.name}
      fields={visibleFields}
      branding={branding}
      payment={payment}
      docgate={docgate ? { path: docgate.path, label: docgate.label } : null}
    />
  );
}

// These "dead end" screens (already signed, declined, voided) previously
// left most of the viewport blank below the status card — every signer who
// lands here has just finished interacting with SignedBy, which is exactly
// the kind of self-serve growth moment worth a small CTA rather than a dead
// stop. Gated on `showGrowthCta` (false when the sending org has paid for
// branding removal, i.e. `hasBranding` — showing our own signup pitch to a
// paying customer's signers would undercut the white-label they bought).
function StatusScreen({
  title,
  message,
  showGrowthCta = false,
  logo,
  children,
}: {
  title: string;
  message: string;
  showGrowthCta?: boolean;
  logo?: { url: string; alt: string };
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200/60 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.url} alt={logo.alt} className="mx-auto mb-4 h-10 w-auto max-w-[180px] rounded object-contain" />
        )}
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {children}
      </div>

      {showGrowthCta && (
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">
            Need to send or sign documents yourself?{" "}
            <span className="inline-block -rotate-1 rounded bg-yellow-300 px-1.5 py-0.5 font-semibold text-slate-900">
              Sign documents.
            </span>
          </p>
          <a
            href="/login?intent=signup"
            className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create your free SignedBy account
          </a>
        </div>
      )}
    </main>
  );
}
