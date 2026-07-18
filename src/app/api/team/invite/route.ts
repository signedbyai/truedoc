import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAndOrg } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { planHasFeature, teamMemberLimit } from "@/lib/plan";
import { sendTeamInviteEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(request: Request) {
  const ctx = await getUserAndOrg();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { supabase, user, orgId } = ctx;

  const inviteOk = await checkRateLimit(`team-invite:${orgId}`, 20, 3600);
  if (!inviteOk) {
    return NextResponse.json({ error: "Too many invites sent. Try again later." }, { status: 429 });
  }

  const { data: org } = await supabase.from("organizations").select("name, plan").eq("id", orgId).single();
  if (!org || !planHasFeature(org.plan, "teamMembers")) {
    return NextResponse.json(
      { error: "Team members require the Team plan or higher.", upgrade: true },
      { status: 402 }
    );
  }

  const { data: requester } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    return NextResponse.json({ error: "Only org owners/admins can invite members" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  const { email, role } = parsed.data;

  // Already a member? Check by email via the admin client since
  // organization_members only stores user_id.
  const { data: existingMembers } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId);
  if (existingMembers && existingMembers.length > 0) {
    const admin = createAdminClient();
    for (const m of existingMembers) {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      if (data?.user?.email?.toLowerCase() === email) {
        return NextResponse.json({ error: "That person is already a member of this org." }, { status: 400 });
      }
    }
  }

  // Seat cap check. Counts current members plus other pending invites (not
  // this one — if this is a resend to the same email, it doesn't add a net
  // new seat) so a sender can't queue up more invites than the plan allows.
  const limit = teamMemberLimit(org.plan);
  if (limit !== null) {
    const { count: pendingCount } = await supabase
      .from("org_invites")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    const seatsUsed = (existingMembers?.length ?? 0) + (pendingCount ?? 0);
    if (seatsUsed >= limit) {
      return NextResponse.json(
        { error: `Your plan allows up to ${limit} team members. Upgrade to add more.`, upgrade: true },
        { status: 402 }
      );
    }
  }

  // Replace any existing pending invite for the same email so re-sending
  // doesn't pile up stale rows.
  await supabase.from("org_invites").delete().eq("org_id", orgId).eq("email", email).is("accepted_at", null);

  const { data: invite, error } = await supabase
    .from("org_invites")
    .insert({ org_id: orgId, email, role, invited_by: user.id })
    .select("token")
    .single();

  if (error || !invite) {
    console.error("Create invite failed", error);
    return NextResponse.json({ error: "Couldn't create the invite." }, { status: 500 });
  }

  await sendTeamInviteEmail({
    to: email,
    orgName: org.name,
    inviterEmail: user.email || "A teammate",
    token: invite.token,
  }).catch((err) => console.error("Invite email failed", err));

  return NextResponse.json({ success: true });
}
