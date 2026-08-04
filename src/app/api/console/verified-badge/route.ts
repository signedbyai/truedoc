import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireConsoleAccess } from "@/lib/console-conversations";

// GET /api/console/verified-badge — the Verified Badge tab in Console's
// sidebar (CONSOLE_VERIFIED_BADGE_FOCUS_REDESIGN_SCOPE.md, 2026-08-04),
// replacing the old Templates tab. Same requireConsoleAccess gate and
// plain-array response shape as /api/console/templates, but reads
// `documents` where is_verified_badge = true instead of the `templates`
// table.
//
// The hash isn't a column on `documents` itself — it lives on the
// `completed` audit event's `document_hash` (see verified-badge-actions.ts's
// sealDocumentAction), so this does a second, batched query against
// audit_events for the returned document ids rather than a per-row query.
export async function GET() {
  const ctx = await requireConsoleAccess();
  if ("error" in ctx) return ctx.error;

  const admin = createAdminClient();
  const { data: docs, error } = await admin
    .from("documents")
    .select("id, title, created_at, certificate_file_path, signed_file_path")
    .eq("org_id", ctx.orgId)
    .eq("is_verified_badge", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("List console verified badge documents failed", error);
    return NextResponse.json({ error: "Couldn't load your sealed documents." }, { status: 500 });
  }

  const docIds = (docs ?? []).map((d) => d.id);
  const sealedInfoByDoc = new Map<string, { hash: string | null; sealedAt: string | null }>();
  if (docIds.length > 0) {
    const { data: completedEvents } = await admin
      .from("audit_events")
      .select("document_id, document_hash, created_at")
      .in("document_id", docIds)
      .eq("event_type", "completed");
    for (const e of completedEvents ?? []) {
      sealedInfoByDoc.set(e.document_id, {
        hash: typeof e.document_hash === "string" ? e.document_hash : null,
        sealedAt: typeof e.created_at === "string" ? e.created_at : null,
      });
    }
  }

  const documents = (docs ?? []).map((d) => {
    const sealedInfo = sealedInfoByDoc.get(d.id);
    return {
      id: d.id,
      title: d.title,
      // Falls back to the document row's own created_at (upload time) if
      // the completed event is somehow missing — shouldn't happen for a
      // row that's is_verified_badge = true, but a slightly-off timestamp
      // beats a broken list.
      sealedAt: sealedInfo?.sealedAt ?? d.created_at,
      hash: sealedInfo?.hash ?? null,
      hasSignedFile: Boolean(d.signed_file_path),
      hasCertificateFile: Boolean(d.certificate_file_path),
    };
  });

  return NextResponse.json({ documents });
}
