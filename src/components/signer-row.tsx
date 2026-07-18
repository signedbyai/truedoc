"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopySigningLinkButton } from "@/components/copy-signing-link-button";
import { RemindSignerButton } from "@/components/remind-signer-button";
import { formatEngagement } from "@/lib/page-view-tracking";
import { StatusPill, SIGNER_STATUS_PILL } from "@/components/status-pill";

type Signer = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  signed_at: string | null;
  signing_token: string;
};

// One row in the document detail page's signer list. Pulled into its own
// client component (rather than inline JSX in the server page) so the
// "Edit recipient" form can expand full-width below the row instead of
// being squeezed into the same inline button cluster as Copy link/Remind.
export function SignerRow({
  documentId,
  signer,
  docStatus,
  hasReminders,
  hasPageViewTracking,
  engagement,
}: {
  documentId: string;
  signer: Signer;
  docStatus: string;
  hasReminders: boolean;
  hasPageViewTracking: boolean;
  engagement?: { totalSeconds: number; pagesViewed: number } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(signer.name || "");
  const [email, setEmail] = useState(signer.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isNotifiable = docStatus === "sent" && (signer.status === "sent" || signer.status === "viewed");
  const canEdit = docStatus === "sent" && signer.status !== "signed";
  const engagementLabel = engagement ? formatEngagement(engagement.totalSeconds, engagement.pagesViewed) : null;
  // Tease the upgrade only once there's actually something to see -- a
  // signer who hasn't opened the link yet has no engagement to miss out on,
  // so showing this earlier would just be clutter, not a compelling hook.
  const showEngagementTease =
    !hasPageViewTracking && ["viewed", "signed", "declined"].includes(signer.status);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/signers/${signer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update this recipient.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span>
          {signer.name ? `${signer.name} <${signer.email}>` : signer.email}
          {engagementLabel && <span className="ml-2 text-xs text-slate-400">· {engagementLabel}</span>}
          {showEngagementTease && (
            <Link href="/pricing" className="ml-2 text-xs text-slate-400 hover:text-slate-600">
              · Engagement tracking (Starter+)
            </Link>
          )}
        </span>
        <span className="flex items-center gap-2">
          {isNotifiable && <CopySigningLinkButton signingToken={signer.signing_token} />}
          {isNotifiable &&
            (hasReminders ? (
              <RemindSignerButton documentId={documentId} signerId={signer.id} />
            ) : (
              <Link href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
                Send reminder (Starter+)
              </Link>
            ))}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Edit
            </button>
          )}
          <span className="flex items-center gap-1.5">
            {(() => {
              const pill = SIGNER_STATUS_PILL[signer.status];
              return pill ? (
                <StatusPill tone={pill.tone} label={pill.label} pulse={pill.pulse} />
              ) : (
                <StatusPill tone="gray" label={signer.status} />
              );
            })()}
            {signer.signed_at && (
              <span className="text-xs text-slate-400">{new Date(signer.signed_at).toLocaleDateString()}</span>
            )}
          </span>
        </span>
      </div>

      {editing && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 sm:w-1/3"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <p className="mt-2 text-[11px] text-slate-500">
            If this signer was already notified, they&apos;ll get a fresh invite at the new address and the old link
            stops working.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setName(signer.name || "");
                setEmail(signer.email);
                setError("");
              }}
              disabled={saving}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !email.trim()}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
