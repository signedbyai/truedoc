import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teamMemberLimit } from "@/lib/plan";

export const bodySchema = z.object({ token: z.string().uuid() });

// Accepting an invite adds a brand-new organization_members row for a user
// who isn't yet an org admin — RLS has no policy letting a non-member
// insert themselves, by design, so this goes through the service-role
// admin client after verifying the invite + session ourselves.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite link." }, { status: 400 });

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("org_invites")
    .select("id, org_id, email, role, accepted_at, expires_at")
    .eq("token", parsed.data.token)
    .single();

  if (!invite) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 400 });
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired. Ask for a new one." }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== (user.email || "").toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Log in with that email address to accept it.` },
      { status: 403 }
    );
  }

  // Defense in depth: re-check the seat cap at accept time too, since time
  // may have passed since the invite was sent and other invites may have
  // been accepted in the meantime.
  const { data: org } = await admin.from("organizations").select("plan").eq("id", invite.org_id).single();
  const limit = teamMemberLimit(org?.plan);
  if (limit !== null) {
    const { count: memberCount } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", invite.org_id);
    if ((memberCount ?? 0) >= limit) {
      return NextResponse.json(
        { error: "This organization has reached its plan's team member limit. Contact the org owner." },
        { status: 400 }
      );
    }
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .upsert({ org_id: invite.org_id, user_id: user.id, role: invite.role }, { onConflict: "org_id,user_id" });

  if (memberError) {
    console.error("Accept invite: insert member failed", memberError);
    return NextResponse.json({ error: "Couldn't join the org. Try again." }, { status: 500 });
  }

  await admin.from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ success: true });
}
