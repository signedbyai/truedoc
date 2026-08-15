import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/v1/documents/[id]/void — cancel a sent document via API.
// CRM_MCP_READINESS_PHASE1_SCOPE.md Part A#5: "deal fell through, kill the
// pending contract" automations. Mirrors documents/[id]/void/route.ts
// exactly, just API-key gated instead of session-gated.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Added 2026-08-12 — no rate limit at all previously. Same 60/hr ceiling
  // as /documents' own mutating POST, matching the precedent already set
  // for a write action.
  const rateOk = await checkRateLimit(`api-v1-void:${auth.orgId}`, 60, 3600);
  if (!rateOk) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id, org_id, status").eq("id", id).single();
  if (!doc || doc.org_id !== auth.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.status !== "sent") {
    return NextResponse.json({ error: "Only documents that are out for signature can be voided." }, { status: 400 });
  }

  await admin.from("documents").update({ status: "voided" }).eq("id", id);
  await admin.from("audit_events").insert({
    document_id: id,
    event_type: "voided",
    metadata: { via_api: true },
  });

  return NextResponse.json({ success: true });
}
