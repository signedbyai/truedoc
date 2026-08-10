"use client";

// Embedded, in-page PDF preview -- added 2026-08-10, direct follow-up to
// the download/share fixes above it in the same file group. Tapping
// "Badge-on sealed PDF" now reliably hands the file to the OS share sheet
// (DownloadShareButton), but a user who just wants to LOOK at what
// they're about to send had no way to do that without going through the
// share sheet's own Quick Look step first -- direct question: "is that
// normal?" Researched how DocuSign/Adobe Sign/PandaDoc handle this (same
// session): they show the document inline first, with Download/Share as
// controls attached to that view, rather than share-sheet-first.
//
// SIMPLIFIED same day, direct follow-up ("I don't think I need the
// separate preview button... let's just generate the preview as the 1st
// step to reduce the button count"): originally this sat next to a
// separate DownloadShareButton (two buttons per output). Collapsed into
// one -- the single trigger below IS the preview trigger; Download/Share
// now lives only inside the opened panel, not as a second top-level
// button. `children` is the trigger's closed-state label/icon (e.g. the
// Stamp icon + "Badge-on sealed PDF" text that used to belong to the
// separate download button); the OutputHint one-time popovers wrap only
// this component's own internal trigger button now, not a second element,
// via the optional `hint` prop -- see the comment above the `hint` field
// below for why that has to happen INSIDE this component rather than the
// caller wrapping it externally.
//
// Lazy: pdfjs-dist and the actual PDF bytes are only fetched once the
// trigger is tapped -- nothing extra loads for anyone who doesn't open a
// given output at all.
//
// Same progressive-render/polyfill/worker pattern as signing-view.tsx's
// own continuous-scroll viewer (pages append to state as they finish
// rendering, not all at once) -- reused rather than re-derived. This is a
// read-only preview with no field overlays, so it's a smaller version of
// the same approach. getDocument({url}) fetches and parses by the PDF's
// own magic bytes, not the response's Content-Type header, so this works
// unmodified against the application/octet-stream-serving routes (67d4ddb) --
// no conflict with that fix.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { DownloadShareButton } from "@/components/download-share-button";
import { OutputHint } from "@/components/output-hint";
import { installMapUpsertPolyfill } from "@/lib/pdfjs-map-polyfill";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RenderedPage = { page: number; dataUrl: string; width: number; height: number };

export function EmbeddedPdfPreview({
  href,
  filename,
  triggerClassName,
  children,
  hint,
}: {
  href: string;
  filename: string;
  triggerClassName?: string;
  /** Trigger's closed-state content -- icon + label, e.g. the same
   *  <Stamp/>+"Badge-on sealed PDF" the old separate download button used
   *  to show. Swapped for an EyeOff+"Hide preview" pair while open. */
  children: ReactNode;
  /** One-time "best for X" popover (output-hint.tsx), now wrapped around
   *  this component's OWN trigger button internally rather than by the
   *  caller wrapping the whole component -- this component's outer div
   *  becomes `w-full` once opened (see the className comment below), and
   *  OutputHint's own wrapper is an inline-flex span; nesting a
   *  conditionally-w-full block inside that span made the open panel's
   *  width resolution ambiguous. Keeping OutputHint's span around just the
   *  fixed-size button (never around the panel) sidesteps that entirely. */
  hint?: { storageKey: string; text: string; active?: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const startedRef = useRef(false);

  // Renders once, the first time the panel is opened -- startedRef (not
  // `open` alone) guards this so collapsing and reopening the panel just
  // toggles visibility of the already-rendered pages instead of re-fetching
  // and re-rendering the whole document a second time.
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    async function render() {
      setLoading(true);
      setError(false);
      try {
        installMapUpsertPolyfill();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.polyfill.mjs";
        const pdf = await pdfjsLib.getDocument({ url: href }).promise;
        if (cancelled) return;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          const rendered = { page: pageNum, dataUrl: canvas.toDataURL(), width: viewport.width, height: viewport.height };
          setPages((prev) => [...prev, rendered]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Embedded PDF preview: failed to render", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [open, href]);

  const trigger = (
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
  );

  return (
    // w-full only once opened -- this sits inside a flex-wrap button row
    // alongside its siblings; staying content-width while closed keeps it
    // inline with the rest of the row, and only forces a line wrap for the
    // (much wider) panel once there's actually a panel to show.
    <div className={cn(open && "w-full")}>
      {hint ? (
        <OutputHint storageKey={hint.storageKey} hint={hint.text} active={hint.active ?? true}>
          {trigger}
        </OutputHint>
      ) : (
        trigger
      )}

      {open && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div className="max-h-[70vh] overflow-y-auto p-2 sm:max-h-[75vh]">
            {loading && pages.length === 0 && (
              <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading preview…
              </div>
            )}
            {error && (
              <div className="flex h-40 flex-col items-center justify-center gap-1 px-6 text-center text-xs text-slate-400">
                Couldn&apos;t load a preview here — the download/share button below still works.
              </div>
            )}
            <div className="space-y-2">
              {pages.map(({ page, dataUrl, width, height }) => (
                <div
                  key={page}
                  className="mx-auto w-full border border-slate-200 bg-white shadow-sm"
                  style={{ aspectRatio: `${width} / ${height}`, maxWidth: `${width}px` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local canvas data URL, not a static/remote asset */}
                  <img src={dataUrl} alt={`Page ${page}`} className="block h-full w-full select-none" draggable={false} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
            <span className="text-xs text-slate-500">
              {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : ""}
            </span>
            <DownloadShareButton href={href} filename={filename} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
              Download / Share
            </DownloadShareButton>
          </div>
        </div>
      )}
    </div>
  );
}
