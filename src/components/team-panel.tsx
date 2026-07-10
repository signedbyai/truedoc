"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = { id: string; user_id: string; role: string; email: string };
type Invite = { id: string; email: string; role: string; expires_at: string };

export function TeamPanel({
  currentUserId,
  members,
  invites,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function revokeInvite(id: string) {
    setBusyId(id);
    await fetch(`/api/team/invites/${id}`, { method: "DELETE" }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate-100">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{m.email}</p>
              <p className="text-xs capitalize text-slate-500">{m.role}</p>
            </div>
            {m.role !== "owner" && m.user_id !== currentUserId && (
              <button
                onClick={() => removeMember(m.id)}
                disabled={busyId === m.id}
                className="text-xs font-medium text-slate-500 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{inv.email}</p>
              <p className="text-xs text-slate-500">Invited &middot; {inv.role} &middot; pending</p>
            </div>
            <button
              onClick={() => revokeInvite(inv.id)}
              disabled={busyId === inv.id}
              className="text-xs font-medium text-slate-500 hover:text-red-600"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={invite} className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-900">Invite someone</p>
        <div className="flex gap-2">
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
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-800"
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
    </div>
  );
}
