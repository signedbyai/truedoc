import { NextResponse } from "next/server";
import { getSignerByToken, requireVerifiedSigner } from "@/lib/signing";
import { bodySchema } from "./schema";

// Best-effort visibility for a client-side document-load failure (2026-07-25
// follow-up to DOCUMENT_DELIVERY_SECURITY_AUDIT.md): previously, if a
// signer's PDF failed to load (network blip, a slow connection finally
// timing out, a pdf.js parse error), the only trace of it was
// console.error() in that signer's own browser — invisible to Michael
// entirely unless the signer said something. signing-view.tsx now calls
// this once it's given up (the silent auto-retry already failed) and is
// about to show "Couldn't load this document," turning that into a queryable
// audit_events row (migration 0034) instead. Mirrors payment-click/route.ts's
// shape: same token-scoped access, same "this must never itself break the
// signing flow" posture — errors here are swallowed client-side, never
// surfaced to the signer.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;
  const authGate = requireVerifiedSigner(signer);
  if (authGate) return authGate;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await admin.from("audit_events").insert({
    document_id: document.id,
    signer_id: signer.id,
    event_type: "client_load_error",
    ip_address: request.headers.get("x-forwarded-for"),
    user_agent: request.headers.get("user-agent"),
    metadata: { message: parsed.data.message, stage: parsed.data.stage ?? null },
  });

  return NextResponse.json({ success: true });
}
