import { NextResponse } from "next/server";
import { getSignerByToken, requireVerifiedSigner } from "@/lib/signing";
import { visibleFieldsForSigner } from "@/lib/field-visibility";
import { scheduleWebhookEvent } from "@/lib/webhooks";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  // Mark viewed the first time this link is opened (idempotent — only fires
  // from pending/sent, never regresses a signed/declined signer).
  if (signer.status === "pending" || signer.status === "sent") {
    await admin.from("signers").update({ status: "viewed" }).eq("id", signer.id);
    await admin.from("audit_events").insert({
      document_id: document.id,
      signer_id: signer.id,
      event_type: "viewed",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });
    signer.status = "viewed";

    // Outbound webhook (CRM_MCP_READINESS_PHASE1_SCOPE.md Part C). Scheduled
    // to run once the response has already gone back to the signer —
    // dispatch must never add latency to opening the document. See
    // scheduleWebhookEvent's doc comment for why this isn't a bare
    // un-awaited call or a direct after() call.
    scheduleWebhookEvent(document.org_id, "document.viewed", {
      document_id: document.id,
      title: document.title,
      status: document.status,
      signer: { email: signer.email, name: signer.name },
    });
  }

  const { data: fields } = await admin
    .from("document_fields")
    .select("id, type, page, x, y, width, height, value, required, signer_id, template_role")
    .eq("document_id", document.id)
    .order("created_at", { ascending: true });

  // Fields explicitly assigned to this signer, plus any truly-unassigned
  // fields (never tagged for a specific party) when this signer is the
  // document's only recipient — see visibleFieldsForSigner for why a
  // pending template_role doesn't get the same fallback.
  const { count: signerCount } = await admin
    .from("signers")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id);

  const visibleFields = visibleFieldsForSigner(fields || [], signer.id, signerCount ?? 0);

  return NextResponse.json({
    signer: { id: signer.id, name: signer.name, email: signer.email, status: signer.status },
    document: { id: document.id, title: document.title, page_count: document.page_count },
    fields: visibleFields,
  });
}
