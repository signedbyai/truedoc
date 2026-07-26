import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { listFrequentSigners, MAX_NAME_CHARS, MAX_EMAIL_CHARS } from "@/lib/frequent-signers";
import { checkEmailDomainHasMx } from "@/lib/validate-email-domain";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_CHARS),
  email: z.string().trim().email().max(MAX_EMAIL_CHARS),
});

export async function GET() {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId, user } = ctx;

  try {
    const signers = await listFrequentSigners(supabase, orgId, user);
    return NextResponse.json({ signers });
  } catch (err) {
    console.error("List frequent signers failed", err);
    return NextResponse.json({ error: "Could not load frequent signers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, orgId } = ctx;

  const ok = await checkRateLimit(`frequent-signers-add:${orgId}`, 30, 600);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  }

  // Same warn-not-block treatment as the document send flow
  // (BOUNCE_TRACKING_SCOPE.md) — but arguably matters MORE here: a typo saved
  // as a frequent signer gets reused across every future document, not just
  // one send, so it's worth flagging even though it doesn't block saving.
  const domainCheck = await checkEmailDomainHasMx(parsed.data.email);

  const { data, error } = await supabase
    .from("frequent_signers")
    .insert({ org_id: orgId, name: parsed.data.name, email: parsed.data.email, is_self: false })
    .select("id, name, email, is_self")
    .single();

  if (error || !data) {
    console.error("Add frequent signer failed", error);
    return NextResponse.json({ error: "Could not save that contact." }, { status: 500 });
  }

  return NextResponse.json({
    signer: { id: data.id, name: data.name, email: data.email, isSelf: data.is_self },
    ...(domainCheck.ok ? {} : { domainWarning: domainCheck.reason }),
  });
}
