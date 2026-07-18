import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { LIST_STATUS_PILL, StatusPill } from "@/components/status-pill";
import { formatRelativeTime, latestViewedByDocument } from "@/lib/last-viewed";

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
  const { supabase, orgId } = ctx;

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

  // "Last viewed 2m ago" per row (see src/lib/last-viewed.ts for the
  // two-source merge rationale). Two IN-list queries for the visible page
  // of documents, both already covered by RLS org-scoping policies.
  const docIds = (documents || []).map((d) => d.id);
  let lastViewedByDoc = new Map<string, string>();
  if (docIds.length > 0) {
    const [{ data: viewEvents }, { data: pageViews }] = await Promise.all([
      supabase.from("audit_events").select("document_id, created_at").in("document_id", docIds).eq("event_type", "viewed"),
      supabase.from("document_page_views").select("document_id, last_viewed_at").in("document_id", docIds),
    ]);
    lastViewedByDoc = latestViewedByDocument([
      ...(viewEvents || []).map((e) => ({ documentId: e.document_id, at: e.created_at })),
      ...(pageViews || []).map((p) => ({ documentId: p.document_id, at: p.last_viewed_at })),
    ]);
  }

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
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
            <p className="text-sm text-slate-600">{count ?? 0} total</p>
          </div>
          {/* Same pair as the dashboard home, in the same order and at the same
              equal width: slim, rounded, arrowed, min-w set off the longer
              label. Two entry points to the same task should not look
              different depending on which page you reached them from.

              Left button is "From template", not "Upload template" — there is
              no upload-a-template flow to point at. Templates are only created
              by "Save as template" from a document
              (/api/documents/[id]/save-as-template); this goes to the picker,
              which is the real action. Local override rather than a
              ui/button.tsx change — the app-wide restyle was tried in b0e3748
              and rolled back. */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/dashboard/templates"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "flex-1 rounded-lg px-2.5 sm:min-w-[10.5rem] sm:flex-none sm:px-3"
              )}
            >
              From template<span className="hidden sm:inline"> →</span>
            </Link>
            <Link
              href="/dashboard/documents/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "flex-1 rounded-lg px-2.5 sm:min-w-[10.5rem] sm:flex-none sm:px-3"
              )}
            >
              Upload document<span className="hidden sm:inline"> →</span>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find a document</CardTitle>
            <CardDescription>Search by title or recipient name/email, filter by status, or sort.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search, Status, Sort and Apply all sit at h-9 rounded-lg to match
                the Upload document button above. They share a row, so a control
                that is 4px taller or squarer than its neighbour is visible
                immediately. Overridden here rather than in ui/input.tsx: the
                app-wide version of this change was tried in b0e3748 and rolled
                back, so every other form keeps the current height. */}
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
                  Search
                </label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Title, recipient name, or email"
                  className="h-9 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>
              <button
                type="submit"
                className={cn(buttonVariants({ size: "sm" }), "rounded-lg")}
              >
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
                  {documents.map((doc) => {
                    const pill = LIST_STATUS_PILL[doc.status];
                    return (
                    // Same shape as the dashboard's recent-documents rows
                    // (title left, status pill top-right) with the action
                    // buttons on their own right-aligned line — previously
                    // the pill and buttons wrapped into one left-aligned
                    // cluster under the title on mobile, which read as
                    // misaligned clutter.
                    <li key={doc.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/documents/${doc.id}`}
                            className="text-sm font-medium text-slate-900 hover:underline"
                          >
                            {doc.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {/* Short doc ID (first 8 of the UUID) — the same
                                ID the Certificate of Completion prints in
                                full, so a sender can eyeball-match a cert or
                                /verify result to the row (V3 item #5). */}
                            <span className="font-mono text-slate-400">#{doc.id.slice(0, 8)}</span> &middot;{" "}
                            {doc.page_count} page{doc.page_count === 1 ? "" : "s"} &middot;{" "}
                            {new Date(doc.created_at).toLocaleDateString()}
                            {lastViewedByDoc.has(doc.id) && (
                              <span className="text-slate-400">
                                {" "}
                                &middot; Last viewed {formatRelativeTime(lastViewedByDoc.get(doc.id)!)}
                              </span>
                            )}
                          </p>
                        </div>
                        {/* One pill, right-aligned at every width. A mobile
                            copy on the meta line was tried and dropped — two
                            pills per row read as a duplicate rather than a
                            responsive swap. */}
                        {pill && (
                          <StatusPill
                            tone={pill.tone}
                            dotTone={pill.dotTone}
                            label={pill.label}
                            className="mt-0.5 shrink-0"
                          />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                        <DuplicateDocumentButton documentId={doc.id} />
                        {doc.status === "draft" && <DeleteDocumentButton documentId={doc.id} />}
                      </div>
                    </li>
                    );
                  })}
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
