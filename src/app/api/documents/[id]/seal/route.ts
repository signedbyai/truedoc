import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sealDocumentAction } from "@/lib/verified-badge-actions";

// POST /api/documents/[id]/seal — dashboard-native Verified Badge sealing
// (2026-08-05, VERIFIED_BADGE_DASHBOARD_SCOPE.md). Thin wrapper around the
// exact same sealDocumentAction Console chat's seal_document confirm step
// and the MCP seal_document tool already call — source: "dashboard" is the
// only thing distinguishing this caller (see that function's own doc
// comment). Session-authenticated like every other dashboard document
// route (send, duplicate), not API-key/service-role like the MCP path.
// The document itself must already exist as a draft with no signers yet —
// same presigned-upload + finalize flow the plain Sign-a-file tab uses
// (loadSealableDocument inside sealDocumentAction enforces this and the
// org-ownership check; nothing duplicated here).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { orgId } = ctx;

  // Always "both" (2026-08-05, direct ask, superseding decision 4's
  // "org's saved Settings preference, ask-as-both" rule) — the dashboard
  // never had a way to ask conversationally, and now it doesn't have a
  // Settings toggle for it either (removed from identity-settings.tsx same
  // day): every dashboard seal just gets both an appended and a separate
  // certificate, no per-org preference read at all. Console/MCP are
  // unaffected — this route is the dashboard's only caller of
  // sealDocumentAction, so Console's own saved preference and its
  // conversational ask keep working exactly as before.
  const result = await sealDocumentAction({
    orgId,
    documentId: id,
    certificateMode: "both",
    source: "dashboard",
  });

  if (!result.ok) return NextResponse.json(result, { status: result.status });
  return NextResponse.json(result);
}
