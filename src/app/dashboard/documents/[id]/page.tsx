import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FieldEditor } from "@/components/field-editor";
import { VoidDocumentButton } from "@/components/void-document-button";
import { RemindSignerButton } from "@/components/remind-signer-button";
import { planHasFeature } from "@/lib/plan";

const SIGNER_STATUS_LABEL: Record<string, string> = {
  pending: "Not yet sent",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
};

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
      "id, title, page_count, status, signed_file_path, payment_link_url, payment_label, organizations(plan)"
    )
    .eq("id", id)
    .single();

  if (!doc) notFound();

  const orgData = doc.organizations as unknown as { plan?: string } | { plan?: string }[] | undefined;
  const orgPlan = Array.isArray(orgData) ? orgData[0]?.plan : orgData?.plan;
  const hasPaymentCollection = planHasFeature(orgPlan, "paymentCollection");

  if (doc.status === "completed") {
    const { data: signers } = await supabase
      .from("signers")
      .select("id, name, email, signed_at")
      .eq("document_id", id)
      .order("order_index", { ascending: true });

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <p className="text-sm text-emerald-600">Completed — every signer has signed.</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Signers</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(signers || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.name ? `${s.name} <${s.email}>` : s.email}</span>
                  <span className="text-xs text-slate-500">
                    {s.signed_at ? new Date(s.signed_at).toLocaleString() : "—"}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={`/api/documents/${id}/signed-file`}
              className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {doc.signed_file_path ? "Download signed PDF" : "Signed PDF pending…"}
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (doc.status === "sent" || doc.status === "declined" || doc.status === "voided") {
    const { data: signers } = await supabase
      .from("signers")
      .select("id, name, email, status, signed_at")
      .eq("document_id", id)
      .order("order_index", { ascending: true });

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
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{doc.title}</h1>
            <p className={`text-sm ${className}`}>{label}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Signers</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(signers || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span>{s.name ? `${s.name} <${s.email}>` : s.email}</span>
                  <span className="flex items-center gap-2">
                    {doc.status === "sent" && (s.status === "sent" || s.status === "viewed") && (
                      <RemindSignerButton documentId={id} signerId={s.id} />
                    )}
                    <span className="text-xs text-slate-500">
                      {SIGNER_STATUS_LABEL[s.status] ?? s.status}
                      {s.signed_at ? ` · ${new Date(s.signed_at).toLocaleDateString()}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {doc.status === "sent" && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <VoidDocumentButton documentId={id} />
              </div>
            )}
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
      initialPaymentLinkUrl={doc.payment_link_url}
      initialPaymentLabel={doc.payment_label}
    />
  );
}
