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
//
// FIXED 2026-08-10 (direct report + screenshot: sharing the Badge-on PDF
// on mobile showed a raw /api/documents/... URL instead of the actual
// file). Root cause: every one of these file-download links used
// target="_blank" with no `download` attribute — on mobile Safari in
// particular, that combination often renders the PDF in an in-page Quick
// Look preview rather than committing to an actual download, and tapping
// iOS's own Share icon FROM that preview shares the page's URL, not the
// file. Fixed by dropping target="_blank"/rel="noreferrer" (unnecessary
// for a same-origin file response) and adding a real `download` attribute
// to every one of these — that's the standard signal that makes the
// browser treat the response as a file to save, not a page to render, so
// there's no in-page preview left to share the URL of in the first place.
// The value doesn't need to exactly match the server's own
// Content-Disposition filename (browsers prefer the header's filename
// when both are present) — it only needs to be non-empty. NOT applied to
// "Open verify page" below, which is a genuine page navigation, not a
// file download, and should keep opening in a new tab.
//
// FIXED FURTHER 2026-08-10 (round 3, direct report): the download itself
// now works, but it's silent -- no on-screen confirmation or open
// affordance, so the user has to go find the file themselves afterward.
// All the file-download buttons below (everything except "Open verify
// page", which was never a download) went through DownloadShareButton,
// which fetches the file client-side and hands it to navigator.share() as
// a real File -- that's what gets the native "Open in..."/"Save to Files"
// share sheet, with a same-behavior blob-download fallback wherever file
// sharing isn't supported. See that component's own header comment.
//
// ADDED then SIMPLIFIED, same day (direct follow-up: "when I press
// Badge-on sealed PDF I don't get a preview, I get sent to the share sheet
// -- is that normal?", then "I don't think I need the separate preview
// button... let's just generate the preview as the 1st step to reduce the
// button count"): first pass added a second, separate "Preview" button
// next to each download button. Collapsed into one button per output --
// EmbeddedPdfPreview (PDF outputs) and ImagePreviewToggle (the PNG badge
// image) are now each a single trigger that opens straight to an in-page
// preview; Download/Share lives only inside that opened panel now, not as
// a separate top-level button. Matches the DocuSign/Adobe Sign/PandaDoc
// pattern researched earlier this session more closely -- view first, act
// from within that view -- while staying lazy (nothing loads until tapped).
import { useEffect, useState } from "react";
import { ExternalLink, FileText, ShieldCheck, ChevronDown, Stamp } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ShareLinkButton } from "@/components/share-link-button";
import { QrLinkButton } from "@/components/qr-link-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { DownloadShareButton } from "@/components/download-share-button";
import { EmbeddedPdfPreview } from "@/components/embedded-pdf-preview";
import { ImagePreviewToggle } from "@/components/embedded-image-preview";
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
          <EmbeddedPdfPreview
            href={`/api/documents/${documentId}/badge-on`}
            filename="badge-on-sealed.pdf"
            hint={{
              storageKey: "sb_output_hint_badge_placement_nudge_seen",
              text: 'You can also choose exactly where the badge lands — turn on "Ask me every time" under Settings > Verified Badge > Badge placement.',
              active: activeHint === "badge_placement_nudge",
            }}
          >
            <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
            Badge-on sealed PDF
          </EmbeddedPdfPreview>
        ) : (
          <ImagePreviewToggle
            href={`/api/documents/${documentId}/badge`}
            filename="badge.png"
            alt="Verified Badge"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Badge image
          </ImagePreviewToggle>
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
            <EmbeddedPdfPreview
              href={`/api/documents/${documentId}/signed-file`}
              filename="post-doc-sealed.pdf"
              triggerClassName={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Post-doc sealed PDF
            </EmbeddedPdfPreview>
          )}
          {hasCertificateFile && (
            <EmbeddedPdfPreview
              href={`/api/documents/${documentId}/certificate`}
              filename="certificate.pdf"
              triggerClassName={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              hint={{
                storageKey: "sb_output_hint_certificate_seen",
                text: "Best for datarooms — keeps your original file completely untouched, with proof filed separately.",
                active: activeHint === "certificate",
              }}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Certificate
            </EmbeddedPdfPreview>
          )}
          {hasBadgeOn && (
            <ImagePreviewToggle
              href={`/api/documents/${documentId}/badge`}
              filename="badge.png"
              alt="Verified Badge"
              triggerClassName={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Badge image
            </ImagePreviewToggle>
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
          <DownloadShareButton
            href={`/api/documents/${documentId}/original-file`}
            filename="original.pdf"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Download original (unsigned)
          </DownloadShareButton>
          <DuplicateDocumentButton documentId={documentId} />
        </div>
      )}
    </div>
  );
}
