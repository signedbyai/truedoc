"use client";

import { useEffect, useState } from "react";

// Companion to CopySigningLinkButton (see WHATSAPP_SIGNING_LINK_SCOPE.md's
// "options to get this to someone's mobile phone" discussion, 2026-08-07) --
// when the Web Share API is available, this hands the exact same signing
// link to the device's own native share sheet: WhatsApp, Messages/SMS, Mail,
// Telegram, AirDrop, whatever's installed. SignedBy never sends anything
// here -- the sender does, through their own accounts -- so none of the
// WhatsApp scope's approval/consent/cost problems apply. Same
// navigator.share pattern already proven in this codebase
// (referral-card.tsx, signing-view.tsx).
//
// Feature-detected via useEffect (not a plain `typeof navigator.share`
// check at render time) to avoid a server/client hydration mismatch --
// starts hidden on both server and first client render, then reveals
// itself once mounted if the API exists. Most desktop browsers don't
// support sharing a URL this way; CopySigningLinkButton already covers
// that case, so this button simply doesn't render there rather than
// showing something that would fail.
export function ShareSigningLinkButton({
  signingToken,
  documentTitle,
  signerName,
}: {
  signingToken: string;
  documentTitle: string;
  signerName?: string | null;
}) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleShare() {
    const link = `${window.location.origin}/sign/${signingToken}`;
    const greeting = signerName ? `Hi ${signerName}, ` : "";
    try {
      await navigator.share({
        title: "SignedBy",
        text: `${greeting}please review and sign "${documentTitle}":`,
        url: link,
      });
    } catch (err) {
      // AbortError means the sender closed the share sheet themselves --
      // respect that silently rather than falling back to anything else,
      // same as signing-view.tsx's own share flows.
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  if (!supported) return null;

  return (
    <button type="button" onClick={handleShare} className="text-xs font-medium text-slate-500 hover:text-slate-700">
      Share
    </button>
  );
}
