import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignerByToken } from "@/lib/signing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { AUTH_CODE_MAX_ATTEMPTS, hashAuthCode } from "@/lib/auth-code";

const bodySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

// Verifies the code issued by /auth/request. On success, marks the signer
// verified (auth_verified_at) and logs an audit_events row — the actual
// dispute-resistance artifact this whole feature exists to produce. See
// PER_RECIPIENT_AUTH_SCOPE.md.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await checkRateLimit(`sign-auth-verify:${getClientIp(request)}`, 15, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await getSignerByToken(token);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { admin, signer, document } = result;

  if (!signer.auth_required) {
    return NextResponse.json({ error: "Verification isn't required for this link." }, { status: 400 });
  }
  if (signer.auth_verified_at) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const { data: row } = await admin
    .from("signers")
    .select("auth_code_hash, auth_code_expires_at, auth_attempts")
    .eq("id", signer.id)
    .single();

  if (!row?.auth_code_hash || !row.auth_code_expires_at) {
    return NextResponse.json({ error: "Request a code first." }, { status: 400 });
  }
  if (new Date(row.auth_code_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That code expired. Request a new one." }, { status: 400 });
  }
  if (row.auth_attempts >= AUTH_CODE_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  const candidateHash = hashAuthCode(parsed.data.code, signer.id);
  if (candidateHash !== row.auth_code_hash) {
    await admin
      .from("signers")
      .update({ auth_attempts: row.auth_attempts + 1 })
      .eq("id", signer.id);
    return NextResponse.json({ error: "That code wasn't right." }, { status: 400 });
  }

  const { error } = await admin
    .from("signers")
    .update({
      auth_verified_at: new Date().toISOString(),
      auth_code_hash: null,
      auth_code_expires_at: null,
      auth_attempts: 0,
    })
    .eq("id", signer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_events").insert({
    document_id: document.id,
    signer_id: signer.id,
    event_type: "identity_verified",
    ip_address: request.headers.get("x-forwarded-for"),
    user_agent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true });
}
