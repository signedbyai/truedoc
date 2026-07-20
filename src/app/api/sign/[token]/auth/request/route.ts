import { NextResponse } from "next/server";
import { getSignerByToken } from "@/lib/signing";
import { sendVerificationCodeEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { authCodeExpiryIso, generateAuthCode, hashAuthCode, isWithinResendCooldown } from "@/lib/auth-code";
import { maskEmail } from "@/lib/mask-email";

// Generates and emails a fresh 6-digit code for a signer whose recipient row
// has auth_required set (see PER_RECIPIENT_AUTH_SCOPE.md). Called on first
// load of the verification screen, and again on "resend" — idempotent in
// the sense that either call just issues a new code, invalidating any
// earlier one for the same signer.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await checkRateLimit(`sign-auth-request:${getClientIp(request)}`, 8, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
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

  const { data: current } = await admin
    .from("signers")
    .select("auth_code_expires_at")
    .eq("id", signer.id)
    .single();
  if (isWithinResendCooldown(current?.auth_code_expires_at ?? null)) {
    return NextResponse.json({ error: "Give it a moment before requesting another code." }, { status: 429 });
  }

  const code = generateAuthCode();
  const { error } = await admin
    .from("signers")
    .update({
      auth_code_hash: hashAuthCode(code, signer.id),
      auth_code_expires_at: authCodeExpiryIso(),
      auth_attempts: 0,
    })
    .eq("id", signer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await sendVerificationCodeEmail({
      to: signer.email,
      signerName: signer.name,
      documentTitle: document.title,
      code,
    });
  } catch (err) {
    console.error("Verification code email failed", err);
    return NextResponse.json({ error: "Couldn't send the code. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, maskedEmail: maskEmail(signer.email) });
}
