"use client";

// Sealed-document output row (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md
// V1.3b/V1.4, built 2026-08-10) — pulled out of
// dashboard/documents/[id]/page.tsx (a server component) into its own
// client component because this now needs real interactive state: an
// expand/collapse toggle, and sequencing which one-time OutputHint pops
// open first (only one at a time, using OutputHint's new `active` prop —
// see that file's comment on the mobile-collision problem this fixes).
//
// V1.3b: one prominent option (Badge-on sealed PDF once it exists, else
// the standalone Badge image PNG), everything else — Post-doc sealed PDF
// (renamed from "Sealed PDF" 2026-08-10, the appended-certificate-page
// variant), Certificate (separate, untouched-original variant, unchanged
// name), Badge image (once Badge-on exists and takes over as primary),
// and the verify-link share options — behind a "Show all options" toggle.
import { useEffect, useState } from "react";
import { ExternalLink, FileText, ShieldCheck, ChevronDown, Stamp } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ShareLinkButton } from "@/components/share-link-button";
import { QrLinkButton } from "@/components/qr-link-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { OutputHint } from "@/components/output-hint";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Priority order for the one-time popovers — first unseen one in this list
// wins for a given page view (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md
// V1.3): the badge-placement discovery nudge goes first (and only shows at
// all on the org's genuinely first seal — an opt-in toggle nobody's ever
// told about is a feature that effectively doesn't exist), then Certificate,
// then Badge image, matching their existing storage keys/copy unchanged.
const HINT_PRIORITY = ["badge_placement_nudge", "certificate", "badge"] as const;
type HintKey = (typeof HINT_PRIORITY)[number];

function useActiveHint(candidates: Partial<Record<HintKey, boolean>>): HintKey | null {
  const [active, setActive] = useState<HintKey | null>(null);
  useEffect(() => {
    for (const key of HINT_PRIORITY) {
      if (!candidates[key]) continue;
      let seen = true;
      try {
        seen = window.localStorage.getItem(`sb_output_hint_${key}_seen`) === "1";
      } catch {
        seen = true;
      }
      if (!seen) {
        setActive(key);
        return;
      }
    }
    setActive(null);
    // Only re-run when the candidate SET changes shape, not on every
    // render — candidates is a plain object literal from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(candidates)]);
  return active;
}

export function SealedDocumentOutputs({
  documentId,
  verifyUrl,
  hasSignedFile,
  hasCertificateFile,
  hasBadgeOn,
  isFirstSeal,
}: {
  documentId: string;
  verifyUrl: string | null;
  hasSignedFile: boolean;
  hasCertificateFile: boolean;
  hasBadgeOn: boolean;
  isFirstSeal: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeHint = useActiveHint({
    badge_placement_nudge: isFirstSeal,
    certificate: hasCertificateFile,
    badge: true,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {hasBadgeOn ? (
          <OutputHint
            storageKey="sb_output_hint_badge_placement_nudge_seen"
            active={activeHint === "badge_placement_nudge"}
            hint="You can also choose exactly where the badge lands — turn on &quot;Ask me every time&quot; under Settings &gt; Verified Badge &gt; Badge placement."
          >
            <a
              href={`/api/documents/${documentId}/badge-on`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
              Badge-on sealed PDF
            </a>
          </OutputHint>
        ) : (
          <OutputHint
            storageKey="sb_output_hint_badge_seen"
            active={activeHint === "badge_placement_nudge" || activeHint === "badge"}
            hint={
              activeHint === "badge_placement_nudge"
                ? 'You can also choose exactly where the badge lands — turn on "Ask me every time" under Settings > Verified Badge > Badge placement.'
                : "Best for invoices — a clean mark you can drop straight into it, nothing else to manage."
            }
          >
            <a
              href={`/api/documents/${documentId}/badge`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Badge image
            </a>
          </OutputHint>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          {expanded ? "Hide other options" : "Show all options"}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {hasSignedFile && (
            <a
              href={`/api/documents/${documentId}/signed-file`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Post-doc sealed PDF
            </a>
          )}
          {hasCertificateFile && (
            <OutputHint
              storageKey="sb_output_hint_certificate_seen"
              active={activeHint === "certificate"}
              hint="Best for datarooms — keeps your original file completely untouched, with proof filed separately."
            >
              <a
                href={`/api/documents/${documentId}/certificate`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Certificate
              </a>
            </OutputHint>
          )}
          {hasBadgeOn && (
            <a
              href={`/api/documents/${documentId}/badge`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Badge image
            </a>
          )}
          {verifyUrl && (
            <>
              <CopyLinkButton value={verifyUrl} label="Copy verify link" />
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Open verify page
              </a>
              <ShareLinkButton link={verifyUrl} shareText="Here's the verification link:" label="Share verify link" />
              <QrLinkButton link={verifyUrl} caption="Their camera opens this document's verification page." />
            </>
          )}
          <a href={`/api/documents/${documentId}/original-file`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Download original (unsigned)
          </a>
          <DuplicateDocumentButton documentId={documentId} />
        </div>
      )}
    </div>
  );
}
