"use client";

// Embedded, in-page PDF preview -- added 2026-08-10, direct follow-up to
// the download/share fixes above it in the same file group. Tapping
// "Badge-on sealed PDF" now reliably hands the file to the OS share sheet
// (DownloadShareButton), but a user who just wants to LOOK at what
// they're about to send had no way to do that without going through the
// share sheet's own Quick Look step first -- direct question: "is that
// normal?" Researched how DocuSign/Adobe Sign/PandaDoc handle this
// (same session): they show the document inline first, with
// Download/Share as controls attached to that view, rather than
// share-sheet-first. This adds that as an option alongside the existing
// one-tap share -- it doesn't replace it, since "just send this to my
// client over WhatsApp" (the share-sheet-first flow) is still the faster
// path for the common case.
//
// Lazy: pdfjs-dist and the actual PDF bytes are only fetched once the user
// taps "Preview" -- nothing extra loads for the (probably still more
// common, especially on the 70%-mobile-traffic userbase) case of someone
// who never opens this panel at all.
//
// Same progressive-render/polyfill/worker pattern as signing-view.tsx's
// own continuous-scroll viewer (pages append to state as they finish
// rendering, not all at once) -- reused rather than re-derived. This is a
// read-only preview with no field overlays, so it's a smaller version of
// the same approach. getDocument({url}) fetches and parses by the PDF's
// own magic bytes, not the response's Content-Type header, so this works
// unmodified against the application/octet-stream-serving routes (67d4ddb) --
// no conflict with that fix.
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { DownloadShareButton } from "@/components/download-share-button";
import { installMapUpsertPolyfill } from "@/lib/pdfjs-map-polyfill";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RenderedPage = { page: number; dataUrl: string; width: number; height: number };

export function EmbeddedPdfPreview({
  href,
  filename,
  triggerClassName,
  triggerLabel = "Preview",
}: {
  href: string;
  filename: string;
  triggerClassName?: string;
  triggerLabel?: string;
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

  return (
    // w-full only once opened -- this sits inside a flex-wrap button row
    // alongside the trigger's siblings; staying content-width while closed
    // keeps it inline with the rest of the row, and only forces a line
    // wrap for the (much wider) panel once there's actually a panel to show.
    <div className={cn(open && "w-full")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        {open ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
        {open ? "Hide preview" : triggerLabel}
      </button>

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
