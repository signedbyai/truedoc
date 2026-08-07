"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CopySigningLinkButton } from "@/components/copy-signing-link-button";
import { ShareSigningLinkButton } from "@/components/share-signing-link-button";
import { RemindSignerButton } from "@/components/remind-signer-button";
import { formatEngagement } from "@/lib/page-view-tracking";
import { StatusPill, SIGNER_STATUS_PILL, EMAIL_EVENT_BADGE } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

type Signer = {
  id: string;
  name: string | null;
  email: string;
  status: string;
  signed_at: string | null;
  signing_token: string;
  last_email_event?: string | null;
};

// One row in the document detail page's signer list. Pulled into its own
// client component (rather than inline JSX in the server page) so the
// "Edit recipient" form can expand full-width below the row instead of
// being squeezed into the same inline button cluster as Copy link/Remind.
export function SignerRow({
  documentId,
  documentTitle,
  signer,
  docStatus,
  hasReminders,
  hasPageViewTracking,
  engagement,
}: {
  documentId: string;
  documentTitle: string;
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
  // Non-blocking — the correction already went through and the invite (if
  // any) already sent; this just flags a possible typo the sender may want
  // to double-check. See BOUNCE_TRACKING_SCOPE.md.
  const [domainWarning, setDomainWarning] = useState("");

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
      setDomainWarning(typeof data.domainWarning === "string" ? data.domainWarning : "");
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
        <span className="relative inline-block">
          {signer.name ? `${signer.name} <${signer.email}>` : signer.email}
          {engagementLabel && <span className="ml-2 text-xs text-slate-400">· {engagementLabel}</span>}
          {showEngagementTease && (
            <Link href="/pricing" className="ml-2 text-xs text-slate-400 hover:text-slate-600">
              · Engagement tracking (Pro+)
            </Link>
          )}
          {/* Floating dismissible popover, same shape as the referral gift
              button's popover (referral-gift-button.tsx) and the
              frequent-signers add form — anchored near the address it's
              about, not a full-width inline line. Non-blocking: the
              correction already went through. See BOUNCE_TRACKING_SCOPE.md. */}
          {domainWarning && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setDomainWarning("")}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Double-check this address</p>
                  <button
                    type="button"
                    onClick={() => setDomainWarning("")}
                    aria-label="Close"
                    className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">{domainWarning}</p>
              </div>
            </>
          )}
        </span>
        <span className="flex items-center gap-2">
          {isNotifiable && <CopySigningLinkButton signingToken={signer.signing_token} />}
          {isNotifiable && (
            <ShareSigningLinkButton
              signingToken={signer.signing_token}
              documentTitle={documentTitle}
              signerName={signer.name}
            />
          )}
          {isNotifiable &&
            (hasReminders ? (
              <RemindSignerButton documentId={documentId} signerId={signer.id} />
            ) : (
              <Link href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
                Send reminder (Pro+)
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
            {signer.last_email_event &&
              EMAIL_EVENT_BADGE[signer.last_email_event] &&
              (() => {
                const badge = EMAIL_EVENT_BADGE[signer.last_email_event!];
                return <StatusPill tone={badge.tone} label={badge.label} />;
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setName(signer.name || "");
                setEmail(signer.email);
                setError("");
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !email.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
