"use client";

import { useState } from "react";

// Companion to CopySigningLinkButton (see WHATSAPP_SIGNING_LINK_SCOPE.md's
// "options to get this to someone's mobile phone" discussion, 2026-08-07) --
// when the Web Share API is available, this hands the exact same signing
// link to the device's own native share sheet: WhatsApp, Messages/SMS, Mail,
// Telegram, AirDrop, whatever's installed. SignedBy never sends anything
// here -- the sender does, through their own accounts -- so none of the
// WhatsApp scope's approval/consent/cost problems apply.
//
// Always renders (no render-time feature detection) -- matches
// referral-card.tsx's own share(), which checks navigator.share only
// inside the click handler and falls back to a clipboard copy otherwise.
// An earlier version of this component hid itself via a useState+useEffect
// support check, which is both unnecessary (this fallback already covers
// the unsupported case) and trips the set-state-in-effect lint rule.
export function ShareSigningLinkButton({
  signingToken,
  documentTitle,
  signerName,
}: {
  signingToken: string;
  documentTitle: string;
  signerName?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const link = `${window.location.origin}/sign/${signingToken}`;
    const greeting = signerName ? `Hi ${signerName}, ` : "";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "SignedBy",
          text: `${greeting}please review and sign "${documentTitle}":`,
          url: link,
        });
        return;
      } catch (err) {
        // AbortError means the sender closed the share sheet themselves --
        // respect that silently, don't fall back to copying instead.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Unsupported, or share failed for a reason other than the sender
    // cancelling -- fall back to a plain clipboard copy, same UX as
    // CopySigningLinkButton.
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op -- nothing more useful to do
    }
  }

  return (
    <button type="button" onClick={handleShare} className="text-xs font-medium text-slate-500 hover:text-slate-700">
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
