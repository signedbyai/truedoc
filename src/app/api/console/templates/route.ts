import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireConsoleAccess } from "@/lib/console-conversations";

type TemplateFieldMapEntry = { role: number | null };

// GET /api/console/templates — the Templates tab in Console's sidebar
// (TEMPLATE_BROWSE_SCOPE.md, Option A, 2026-08-02). Deliberately separate
// from listTemplatesAction (console-actions.ts) rather than widening it:
// that function backs the model's own name-resolution tool call ("send the
// NDA to jane@acme.com") and only ever needed {id, name} for that. This
// route is for rendering an actual card grid, so it needs the same fields
// dashboard/templates/page.tsx's list already proves are real —
// page_count, field count, created_at — plus party count (the distinct
// non-null `role` count in field_map, the same computation
// checkSingleSignerRoleCount does for the bulk-send guard, just for display
// here instead of validation).
export async function GET() {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select("id, name, page_count, field_map, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("List console templates failed", error);
    return NextResponse.json({ error: "Couldn't load your templates." }, { status: 500 });
  }

  const templates = (data ?? []).map((t) => {
    const fieldMap = (t.field_map as TemplateFieldMapEntry[] | null) ?? [];
    const partyCount = new Set(fieldMap.map((f) => f.role).filter((r): r is number => r !== null)).size;
    return {
      id: t.id,
      name: t.name,
      pageCount: t.page_count,
      fieldCount: fieldMap.length,
      // A template with every field untagged (never party-distinguished —
      // see field-assignment-bug-history) has partyCount 0; shown as "1
      // signer" below rather than "0 parties", since that's what sending it
      // through the single-signer fast paths actually means in practice.
      partyCount: Math.max(partyCount, 1),
      createdAt: t.created_at,
    };
  });

  return NextResponse.json({ templates });
}
