import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyDevice } from "@/lib/device";

// DocGate redirect (Business tier — see src/lib/plan.ts). Auth model is
// identical to the signing-token pattern in src/lib/signing.ts: knowing the
// unguessable `docgate_code` *is* the credential, no session required.
// Checks the *document's* status, not this signer's own status — that's
// what actually enforces "don't release the asset until everyone has
// signed," per the whole-document-completion decision.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signers")
    .select("id, document_id, documents(status, docgate_url)")
    .eq("docgate_code", code)
    .single();

  const document = signer?.documents as unknown as { status?: string; docgate_url?: string | null } | undefined;

  if (!signer || document?.status !== "completed" || !document.docgate_url) {
    return NextResponse.redirect(new URL("/g/unavailable", request.url));
  }

  // Best-effort — a logging failure must never block the actual redirect.
  try {
    await admin.from("audit_events").insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      event_type: "docgate_clicked",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
      metadata: {
        device_type: classifyDevice(request.headers.get("user-agent")),
        country: request.headers.get("x-vercel-ip-country"),
        region: request.headers.get("x-vercel-ip-country-region"),
        city: request.headers.get("x-vercel-ip-city"),
      },
    });
  } catch (err) {
    console.error("docgate_clicked audit event failed", err);
  }

  return NextResponse.redirect(document.docgate_url);
}
