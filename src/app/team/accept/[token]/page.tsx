import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInviteClient } from "@/components/accept-invite-client";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // org_invites RLS only lets org admins read rows, so a not-yet-member
  // invitee needs the admin client here — same pattern as the signing flow
  // reading via an unguessable token instead of a session.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("org_invites")
    .select("email, role, accepted_at, expires_at, organizations(name)")
    .eq("token", token)
    .single();

  const org = invite?.organizations as unknown as { name?: string } | { name?: string }[] | undefined;
  const orgName = (Array.isArray(org) ? org[0]?.name : org?.name) || "this workspace";

  if (!invite) {
    return <StatusCard title="Invite not found" message="This invite link isn't valid." />;
  }
  if (invite.accepted_at) {
    return <StatusCard title="Already used" message="This invite has already been accepted." />;
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <StatusCard title="Invite expired" message="Ask whoever invited you to send a new one." />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell
        title={`Join ${orgName}`}
        description={
          <>
            You&apos;ve been invited to join <strong>{orgName}</strong> on SignedBy as {invite.email}.
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Log in or create an account with <strong>{invite.email}</strong>, then come back to this link to accept.
        </p>
        <Link href="/login">
          <Button className="w-full">Go to login</Button>
        </Link>
      </Shell>
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <StatusCard
        title="Wrong account"
        message={`This invite was sent to ${invite.email}, but you're logged in as ${user.email}. Log out and sign in with the invited email to accept it.`}
      />
    );
  }

  return (
    <Shell title={`Join ${orgName}`} description={`You've been invited to join ${orgName} on SignedBy.`}>
      <AcceptInviteClient token={token} />
    </Shell>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200/60 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}
