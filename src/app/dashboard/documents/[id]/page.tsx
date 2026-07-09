import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FieldEditor } from "@/components/field-editor";

export default async function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, page_count, status, signed_file_path")
    .eq("id", id)
    .single();

  if (!doc) notFound();

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

  return <FieldEditor documentId={doc.id} pageCount={doc.page_count} />;
}
