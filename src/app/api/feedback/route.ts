import { NextResponse } from "next/server";
import { getUserAndOrg } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFeedbackEmail } from "@/lib/email";
import { bodySchema } from "./schema";

// In-app "Send us feedback" (the nav message-bubble icon). Emails the note to
// the team via Resend (primary), and best-effort records it in the feedback
// table. Available on every plan.
export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { user, orgId, orgs } = ctx;

  const ok = await checkRateLimit(`feedback:${orgId}`, 10, 3600);
  if (!ok) {
    return NextResponse.json({ error: "Thanks — you've sent a few already. Try again a bit later." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Add a message first." }, { status: 400 });
  }
  const { message, page } = parsed.data;

  const org = orgs.find((o) => o.id === orgId);
  const fromName =
    ((user.user_metadata?.full_name || user.user_metadata?.name || "") as string).trim() || null;

  // Record it (best-effort — never block the send on the DB write).
  try {
    const admin = createAdminClient();
    await admin.from("feedback").insert({
      org_id: orgId,
      user_id: user.id,
      email: user.email ?? null,
      message,
      page: page ?? null,
      plan: org?.plan ?? null,
    });
  } catch (err) {
    console.error("Feedback insert failed", err);
  }

  // Email the team (primary delivery).
  try {
    await sendFeedbackEmail({
      message,
      fromEmail: user.email ?? "",
      fromName,
      orgName: org?.name ?? null,
      plan: org?.plan ?? null,
      page: page ?? null,
    });
  } catch (err) {
    console.error("Feedback email failed", err);
    return NextResponse.json({ error: "Couldn't send just now — try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
