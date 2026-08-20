import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndOrg } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentRowActions } from "@/components/document-row-actions";
import { LIST_STATUS_PILL, SEALED_LIST_PILL, StatusPill } from "@/components/status-pill";
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
    .select("id, title, status, page_count, created_at, is_verified_badge", { count: "exact" })
    .eq("org_id", orgId);
  // Sealed documents used to be excluded here entirely (Console was their
  // only home — CONSOLE_VERIFIED_BADGE_PROVENANCE_SCOPE.md). That's stale
  // now that sealing is a dashboard-native New Document tab
  // (VERIFIED_BADGE_DASHBOARD_SCOPE.md, 2026-08-05) — a document sealed from
  // here needs to actually show up back here, not just live at its own
  // /dashboard/documents/[id] URL right after the redirect. They get their
  // own "Sealed" pill below rather than reading as an ordinary "Completed".

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
              New document<span className="hidden sm:inline"> →</span>
            </Link>
          </div>
        </div>

        <Card>
          {/* No CardHeader here (2026-08-20, direct ask) -- "Find a document"
              plus a description restating what the Search placeholder and
              Status/Sort labels already say was pure redundancy. The "Search"
              field label below carries the meaning on its own.
              CardContent normally pairs with CardHeader and drops its own
              top padding (p-6 pt-0) so the two don't double up -- with no
              header here that left "Search" flush against the card's top
              edge. pt-6 restores the same 24px used on every other side,
              flagged by Michael 2026-08-20 right after this shipped. */}
          <CardContent className="pt-6">
            {/* Search, Status, Sort and Apply all sit at h-9 rounded-lg to match
                the New document button above. They share a row, so a control
                that is 4px taller or squarer than its neighbour is visible
                immediately. Overridden here rather than in ui/input.tsx: the
                app-wide version of this change was tried in b0e3748 and rolled
                back, so every other form keeps the current height. */}
            {/* Below sm: Search + Apply share row 1, Status/Sort/Clear wrap
                to row 2 as a group (2026-08-20, direct ask -- Apply should
                stay glued to Search, only the filter controls should drop).
                Plain flex-wrap can't guarantee that split on its own (it
                wraps whichever item runs out of room, in DOM order, which
                puts Apply on row 2 with the rest) so this uses two things
                together: `order` moves Apply to sit right after Search only
                below sm (sm:order-none reverts everyone to the normal
                Search/Status/Sort/Apply/Clear DOM order at sm+), and the
                aria-hidden basis-full spacer right after Apply forces a hard
                line break there so Status always starts row 2, regardless of
                how much width happens to be left over. At sm and up the
                spacer is hidden and the row is nowrap, same as before. */}
            <form method="get" className="flex flex-wrap items-end gap-3 sm:flex-nowrap">
              <div className="order-1 min-w-[200px] flex-1 sm:order-none sm:min-w-0">
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
              <button
                type="submit"
                className={cn(buttonVariants({ size: "sm" }), "order-2 shrink-0 rounded-lg sm:order-none")}
              >
                Apply
              </button>
              <div aria-hidden="true" className="order-3 h-0 w-full sm:hidden" />
              <div className="order-4 shrink-0 sm:order-none">
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
              <div className="order-5 shrink-0 sm:order-none">
                <label htmlFor="sort" className="mb-1 block text-xs font-medium text-slate-600">
                  Sort
                </label>
                {/* Labels trimmed to "Newest"/"Oldest"/"Title" earlier
                    2026-08-20 because the open option list overlapped
                    Apply -- restored to the full text the same day once the
                    row-wrap fix (Apply glued to Search, Status/Sort dropping
                    to their own row below sm) freed the width back up.
                    Option values unchanged either way. */}
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
              {(q || status || (sort && sort !== "newest")) && (
                <Link
                  href="/dashboard/documents"
                  className="order-6 shrink-0 text-sm text-slate-500 hover:text-slate-700 sm:order-none"
                >
                  Clear
                </Link>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <>
                <ul className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    const pill = doc.is_verified_badge && doc.status === "completed" ? SEALED_LIST_PILL : LIST_STATUS_PILL[doc.status];
                    return (
                    // Single line per row: title/meta left, pill + kebab
                    // menu right. Duplicate/Delete used to sit on their own
                    // second line as always-visible buttons — collapsing
                    // them into DocumentRowActions' "⋯" menu roughly halves
                    // row height (2026-08-20 row-actions consistency pass,
                    // "Option C" — chosen over raising Templates to this
                    // page's old button weight for the density and
                    // mobile-thumb-target wins of one compact line; see
                    // DocumentRowActions' own comment for the full
                    // rationale).
                    <li key={doc.id} className="py-2.5">
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
                        {/* Pill + kebab, right-aligned at every width. A
                            mobile copy on the meta line was tried and
                            dropped — two pills per row read as a duplicate
                            rather than a responsive swap. */}
                        <div className="mt-0.5 flex shrink-0 items-center gap-1">
                          {pill && <StatusPill tone={pill.tone} dotTone={pill.dotTone} label={pill.label} />}
                          <DocumentRowActions documentId={doc.id} isDraft={doc.status === "draft"} />
                        </div>
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
