"use client";

// Generic sibling of ShareSigningLinkButton (signer-row.tsx), for links
// that are already a plain resolved absolute URL at render time (e.g.
// verifyUrl, built server-side from appUrl()) rather than needing
// window.location.origin resolved at click time the way a signer's
// /sign/[token] link does. Styled to match CopyLinkButton (outline pill +
// icon), the row this is meant to sit next to on the sealed-document
// output row.
//
// Always renders (no render-time feature detection) -- matches
// referral-card.tsx's and share-signing-link-button.tsx's own pattern:
// try navigator.share at click time, fall back to a clipboard copy
// otherwise. Avoids a useEffect-based support check entirely (that
// approach trips the set-state-in-effect lint rule and isn't needed once
// the fallback already covers the unsupported case).
import { useState } from "react";
import { Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareLinkButton({
  link,
  shareText,
  label = "Share",
}: {
  link: string;
  shareText?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "SignedBy", text: shareText, url: link });
        return;
      } catch (err) {
        // AbortError means the sender closed the share sheet themselves --
        // respect that silently, don't fall back to copying instead.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op -- nothing more useful to do
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
    >
      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
      {copied ? "Link copied" : label}
    </button>
  );
}
