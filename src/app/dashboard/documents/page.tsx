import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { OrgSwitcher } from "@/components/org-switcher";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  completed: "Completed",
  declined: "Declined",
  voided: "Voided",
};

const STATUS_OPTIONS = ["draft", "sent", "completed", "declined", "voided"] as const;

const SORT_OPTIONS: Record<string, { column: "created_at" | "title"; ascending: boolean }> = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  title: { column: "title", ascending: true },
};

const PAGE_SIZE = 20;

// Strip characters that would otherwise corrupt the hand-built PostgREST
// .or()/.in() filter strings below (comma splits conditions, parens break
// list grouping). Not a security boundary by itself — search terms only
// ever feed into ilike patterns scoped by org_id, never raw SQL — but this
// keeps a stray "," or ")" from producing a broken/empty-looking search.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, " ").trim();
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const { q = "", status = "", sort = "newest", page = "1" } = await searchParams;
  const ctx = await getUserAndOrg();
  if (!ctx) redirect("/login");
  const { supabase, orgId, orgs } = ctx;

  const searchTerm = sanitizeSearchTerm(q);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sortConfig = SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest;

  let query = supabase
    .from("documents")
    .select("id, title, status, page_count, created_at", { count: "exact" })
    .eq("org_id", orgId);

  if (status && STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) {
    query = query.eq("status", status);
  }

  if (searchTerm) {
    // Match on title directly, or on any recipient's name/email for
    // documents in this org — lets a sender find "the contract I sent
    // jane@acme.com" without remembering what they titled it.
    const { data: signerMatches } = await supabase
      .from("signers")
      .select("document_id, documents!inner(org_id)")
      .eq("documents.org_id", orgId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

    const signerDocIds = Array.from(new Set((signerMatches || []).map((s) => s.document_id)));

    const orParts = [`title.ilike.%${searchTerm}%`];
    if (signerDocIds.length > 0) {
      orParts.push(`id.in.(${signerDocIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: documents, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/dashboard/documents${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Documents</h1>
            <p className="text-sm text-slate-600">{count ?? 0} total</p>
          </div>
          <div className="flex items-center gap-2">
            <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
            <Link href="/dashboard/documents/new" className={buttonVariants({ size: "default" })}>
              Upload document
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find a document</CardTitle>
            <CardDescription>Search by title or recipient name/email, filter by status, or sort.</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
                  Search
                </label>
                <Input id="q" name="q" defaultValue={q} placeholder="Title, recipient name, or email" />
              </div>
              <div>
                <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sort" className="mb-1 block text-xs font-medium text-slate-600">
                  Sort
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>
              <button type="submit" className={buttonVariants({ size: "default" })}>
                Apply
              </button>
              {(q || status || (sort && sort !== "newest")) && (
                <Link href="/dashboard/documents" className="text-sm text-slate-500 hover:text-slate-700">
                  Clear
                </Link>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <>
                <ul className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="text-sm font-medium text-slate-900 hover:underline"
                        >
                          {doc.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {doc.page_count} page{doc.page_count === 1 ? "" : "s"} &middot;{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {STATUS_LABEL[doc.status] ?? doc.status}
                        </span>
                        <DuplicateDocumentButton documentId={doc.id} />
                        {doc.status === "draft" && <DeleteDocumentButton documentId={doc.id} />}
                      </div>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <Link
                      href={pageHref(pageNum - 1)}
                      aria-disabled={pageNum <= 1}
                      className={cn(
                        "font-medium text-slate-600 hover:text-slate-900",
                        pageNum <= 1 && "pointer-events-none opacity-40"
                      )}
                    >
                      ← Previous
                    </Link>
                    <span className="text-slate-500">
                      Page {pageNum} of {totalPages}
                    </span>
                    <Link
                      href={pageHref(pageNum + 1)}
                      aria-disabled={pageNum >= totalPages}
                      className={cn(
                        "font-medium text-slate-600 hover:text-slate-900",
                        pageNum >= totalPages && "pointer-events-none opacity-40"
                      )}
                    >
                      Next →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {q || status ? "No documents match your search." : "No documents yet — upload your first PDF to get started."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
