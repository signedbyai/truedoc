import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/v1/templates — list the org's templates (id + name).
// CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#2: needed so a Make/CRM user
// configuring a "create document" action gets a real dropdown of template
// names instead of having to go copy a UUID out of the dashboard by hand.
//
// Pagination added 2026-08-19 (MAKE_APP_REVIEW_FIXES.md) — Make's public-app
// review checklist requires "pagination and limit parameters for search,
// trigger, and RPC modules," and this route backs the list_templates RPC
// that powers the Make/Zapier template-picker dropdowns
// (integrations/make/rpc/list_templates/, integrations/zapier/triggers/
// list_templates.js), neither of which pass limit/offset today and expect
// every template back in one call. DEFAULT_LIMIT is deliberately generous
// (not the small page size /documents uses) specifically so that existing
// unpaginated behavior is unchanged for virtually every real org — this is
// an additive, backward-compatible change, not a default page-size cut.
const LIST_PAGE_SIZE_DEFAULT = 500;
const LIST_PAGE_SIZE_MAX = 500;

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Added 2026-08-12 — this route had no rate limit at all (flagged as a
  // live gap across 6 of 8 api/v1 routes). Same generous read ceiling as
  // /documents and /documents/[id].
  const rateOk = await checkRateLimit(`api-v1-templates:${auth.orgId}`, 120, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const url = new URL(request.url);
  const limit = Math.min(
    LIST_PAGE_SIZE_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") || "", 10) || LIST_PAGE_SIZE_DEFAULT)
  );
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "", 10) || 0);

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("templates")
    .select("id, name, page_count, created_at", { count: "exact" })
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("API v1: list templates failed", error);
    return NextResponse.json({ error: "Couldn't list templates." }, { status: 500 });
  }

  return NextResponse.json({
    templates: data || [],
    total: count ?? null,
    limit,
    offset,
    has_more: count !== null ? offset + (data?.length || 0) < count : (data?.length || 0) === limit,
  });
}
