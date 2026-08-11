"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = { id: string; user_id: string; role: string; email: string };
type Invite = { id: string; email: string; role: string; expires_at: string };

export function TeamPanel({
  currentUserId,
  members,
  invites,
  seatLimit,
  planLabel,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
  seatLimit: number | null;
  // Only needed for the over-limit copy below ("your Team plan allows...") —
  // optional so existing callers/tests don't need updating just to pass it.
  planLabel?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Derived from the members list rather than a new prop — it already
  // includes the signed-in user's own row, so no extra data fetch needed.
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";
  // Admin-tier = owner + admin. Always >= 1 (the owner). "Make admin" only
  // makes sense while this is 1 (an empty 2nd slot) — see
  // ADMIN_ROLE_SCOPE.md / 0033_admin_role_management.sql for the cap.
  const adminTierCount = members.filter((m) => m.role === "owner" || m.role === "admin").length;

  const seatsUsed = members.length + invites.length;
  const atLimit = seatLimit !== null && seatsUsed >= seatLimit;
  // Distinct from atLimit: this only happens after a downgrade (e.g.
  // Business's 5 seats down to Team's 3) leaves more members in place than
  // the new plan allows. Existing members keep working either way — this is
  // purely about giving the admin a clear heads-up instead of them finding
  // out only when a later invite fails. See seatsOverLimit() in plan.ts.
  const seatsOver = seatLimit !== null ? Math.max(0, seatsUsed - seatLimit) : 0;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the invite.");
      setEmail("");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function removeMember(id: string) {
    setBusyId(id);
    await fetch(`/api/team/members/${id}`, { method: "DELETE" }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  async function promote(id: string) {
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/team/members/${id}/promote`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't make them an admin.");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function transferSeat(id: string, targetLabel: string) {
    // A self-demoting action the user can't easily undo themselves (they'd
    // need the new holder to transfer it back) — worth a confirm, unlike
    // removeMember/revokeInvite above which only affect someone else.
    if (!window.confirm(`Transfer your ${currentMember?.role} role to ${targetLabel}? You'll become a regular member.`)) {
      return;
    }
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/team/members/${id}/transfer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't transfer your role.");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setBusyId(id);
    await fetch(`/api/team/invites/${id}`, { method: "DELETE" }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {seatsOver > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Over your seat limit by {seatsOver} member{seatsOver === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {planLabel ? `Your ${planLabel} plan allows` : "Your current plan allows"} up to {seatLimit}, but{" "}
            {seatsUsed} {seatsUsed === 1 ? "is" : "are"} on this workspace right now — this usually happens after a
            downgrade. Everyone keeps working as normal, but you won&apos;t be able to invite anyone new until you
            remove {seatsOver === 1 ? "a member" : "members"} or upgrade.
          </p>
        </div>
      )}
      {seatLimit !== null && (
        <p className="text-xs text-slate-500">
          {seatsUsed} of {seatLimit} seats used
        </p>
      )}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      <ul className="divide-y divide-slate-100">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            {/* min-w-0 is load-bearing here, not decorative: a flex item
                defaults to min-width:auto, so without it this div (and the
                row) refuses to shrink below the email's un-wrapped width. A
                normal title/name would still visually wrap at a space and
                mostly get away with it, but an email/token has no spaces to
                break at, so on a narrow phone screen a long one pushes the
                Remove button off (or forces the whole page to scroll
                horizontally) instead of wrapping. break-all lets it actually
                wrap mid-string as a last resort, matching the break-all
                already used for API key/curl text in dashboard/settings. */}
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-900">{m.email}</p>
              <p className="text-xs capitalize text-slate-500">{m.role}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {/* Only reachable when currentMember holds owner/admin, which
                  implies m isn't currentMember (their role would be "member"
                  here, not owner/admin) — no extra self-exclusion check
                  needed beyond m.role === "member". */}
              {isOwnerOrAdmin && m.role === "member" && (
                <>
                  {adminTierCount < 2 && (
                    <button
                      onClick={() => promote(m.id)}
                      disabled={busyId === m.id}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Make admin
                    </button>
                  )}
                  <button
                    onClick={() => transferSeat(m.id, m.email)}
                    disabled={busyId === m.id}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Transfer my {currentMember?.role} role
                  </button>
                </>
              )}
              {m.role !== "owner" && m.user_id !== currentUserId && (
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={busyId === m.id}
                  className="text-xs font-medium text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-900">{inv.email}</p>
              <p className="text-xs text-slate-500">Invited &middot; {inv.role} &middot; pending</p>
            </div>
            <button
              onClick={() => revokeInvite(inv.id)}
              disabled={busyId === inv.id}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-600"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>

      {atLimit ? (
        <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
          <p className="text-sm font-medium text-slate-900">
            {seatsOver > 0 ? `Remove ${seatsOver === 1 ? "a member" : "members"} to invite anyone new` : `You've used all ${seatLimit} seats on this plan`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {seatsOver > 0 ? "Or upgrade for more seats." : "Upgrade to invite more teammates."}
          </p>
          <Link href="/pricing" className={buttonVariants({ size: "default", className: "mt-3" })}>
            Upgrade
          </Link>
        </div>
      ) : (
        <form onSubmit={invite} className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-900">Invite someone</p>
          {/* Stacks on mobile (flex-col) instead of forcing Email + Role
              onto one row — at narrow widths that squeezed the select down
              to an unreadably tight column, which read as cramped/broken
              rather than intentional. Side-by-side again from `sm:` up,
              where there's room for both. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="space-y-1.5 sm:w-36">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {status === "error" && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Send invite"}
          </Button>
        </form>
      )}
    </div>
  );
}
