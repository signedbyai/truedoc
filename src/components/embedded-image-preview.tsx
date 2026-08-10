"use client";

// Simpler, promoted-to-shared sibling of EmbeddedPdfPreview (embedded-pdf-
// preview.tsx) -- an <img> tag can just be shown or hidden, no pdfjs/canvas
// rendering needed for a single already-browser-native image format.
// Originally private to sealed-document-outputs.tsx; promoted to its own
// file 2026-08-10 once console-verified-badge-list.tsx and console-chat.tsx
// needed the same badge-PNG preview -- see this session's app-wide
// download/share audit for why those two also needed it.
//
// Same single-button shape as EmbeddedPdfPreview: closed state shows
// `children` (icon + label), open state swaps to "Hide preview", and
// Download/Share lives inside the opened panel, not as a second top-level
// button.
import { useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { DownloadShareButton } from "@/components/download-share-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImagePreviewToggle({
  href,
  filename,
  alt,
  triggerClassName,
  children,
}: {
  href: string;
  filename: string;
  alt: string;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(open && "w-full")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? cn(buttonVariants({ size: "sm" }), "gap-1.5")}
      >
        {open ? (
          <>
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            Hide preview
          </>
        ) : (
          children
        )}
      </button>
      {open && (
        // Preview panel stays light regardless of the caller's theme
        // (Console is dark) -- same reasoning as ConsoleQrLinkButton's own
        // popover (console-link-actions.tsx): a badge/QR image is white-
        // background art, so a white preview surface is what actually
        // reads correctly, not a stylistic mismatch to "fix."
        <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated route, not a static/remote asset */}
          <img src={href} alt={alt} className="h-auto max-h-[50vh] w-auto max-w-full rounded border border-slate-200 bg-white" />
          <DownloadShareButton
            href={href}
            filename={filename}
            mimeType="image/png"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            Download / Share
          </DownloadShareButton>
        </div>
      )}
    </div>
  );
}
