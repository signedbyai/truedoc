import { notFound } from "next/navigation";
import { getSignerByToken } from "@/lib/signing";
import { SigningView } from "@/components/signing-view";
import { planHasFeature } from "@/lib/plan";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) notFound();
  const { admin, signer, document } = result;

  if (signer.status === "signed") {
    return (
      <StatusScreen
        title="Already signed"
        message={`You signed "${document.title}" on ${signer.signed_at ? new Date(signer.signed_at).toLocaleDateString() : "record"}. No further action is needed.`}
      />
    );
  }

  if (signer.status === "declined") {
    return <StatusScreen title="Signing declined" message={`You declined to sign "${document.title}".`} />;
  }

  if (document.status === "declined") {
    return (
      <StatusScreen
        title="Document declined"
        message={`Signing was declined by another party, so "${document.title}" is no longer awaiting your signature.`}
      />
    );
  }

  if (document.status === "voided") {
    return <StatusScreen title="No longer available" message="This document has been voided by the sender." />;
  }

  // Mark viewed the first time this link is opened.
  if (signer.status === "pending" || signer.status === "sent") {
    await admin.from("signers").update({ status: "viewed" }).eq("id", signer.id);
    await admin.from("audit_events").insert({
      document_id: document.id,
      signer_id: signer.id,
      event_type: "viewed",
    });
  }

  const { data: fields } = await admin
    .from("document_fields")
    .select("id, type, page, x, y, width, height, value, required, signer_id")
    .eq("document_id", document.id)
    .order("created_at", { ascending: true });

  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id);

  const visibleFields = (fields || []).filter(
    (f) => f.signer_id === signer.id || (f.signer_id === null && signerCount === 1)
  );

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, plan, logo_url, brand_color")
    .eq("id", document.org_id)
    .single();

  const branding = {
    orgId: document.org_id,
    orgName: org?.name || "SignedBy",
    hasBranding: planHasFeature(org?.plan, "branding"),
    hasCustomBranding: planHasFeature(org?.plan, "customBranding"),
    hasLogo: Boolean(org?.logo_url),
    brandColor: org?.brand_color || null,
  };

  return (
    <SigningView
      token={token}
      documentTitle={document.title}
      pageCount={document.page_count}
      signerName={signer.name}
      fields={visibleFields}
      branding={branding}
    />
  );
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}
