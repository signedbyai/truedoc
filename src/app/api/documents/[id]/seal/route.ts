import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { sealDocumentAction, type CertificateMode } from "@/lib/verified-badge-actions";

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
  const { supabase, orgId } = ctx;

  // Certificate mode: the dashboard path never asks (2026-08-05, direct
  // decision 4) — always the org's saved Settings preference
  // (verified-badge-settings.tsx), with a saved "ask" (or no preference set
  // yet, i.e. a brand-new org) treated as "both". Same effective default
  // the MCP seal_document tool already uses, for the same underlying reason:
  // there's no conversation here to ask the appended/separate/both question
  // through, so it needs a sane default rather than Console chat's
  // "ask every time" logic.
  const { data: org } = await supabase
    .from("organizations")
    .select("verified_badge_certificate_mode")
    .eq("id", orgId)
    .single();
  const savedMode = org?.verified_badge_certificate_mode;
  const certificateMode: CertificateMode =
    savedMode === "appended" || savedMode === "separate" || savedMode === "both" ? savedMode : "both";

  const result = await sealDocumentAction({
    orgId,
    documentId: id,
    certificateMode,
    source: "dashboard",
  });

  if (!result.ok) return NextResponse.json(result, { status: result.status });
  return NextResponse.json(result);
}
