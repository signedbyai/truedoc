"use client";

// The "Badge Placer" (IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md V1.1/V1.4,
// built 2026-08-10). Reuses field-editor.tsx's drag pattern (Pointer
// Events, container-relative normalized coordinates) rather than its
// exported functions — this is a new, small component on the Verified
// Badge Seal tab, isolated from the live signer field editor by
// construction (see the scope doc's "Isolation" section: nothing here
// touches resizeField/MIN_FIELD_W/MIN_FIELD_H).
//
// Renders page 1 of the LOCAL file (pdfjs-dist, given the browser File's
// own ArrayBuffer — no upload needed just to preview placement) rather
// than fetching from a server route, since at this point in the Seal tab
// flow the document doesn't exist server-side yet (upload only happens on
// "Seal this file"). Same pdfjs worker setup as field-editor.tsx.
//
// Desktop: freeform drag + a single bottom-right resize handle (width
// only — height always follows BADGE_ASPECT, see badge-resize.ts for why
// that makes the aspect-ratio-stretch problem structurally impossible here
// rather than something to separately guard against).
//
// Mobile: its own interaction, not a scaled-down desktop one — decided
// 2026-08-10 (direct instruction: "make sure it's great on mobile, 70
// percent of users are using it on mobile"). Tap one of four corner
// presets, then a size slider. Below MOBILE_BREAKPOINT, the drag/resize
// affordances are replaced by this control panel entirely; the live
// preview box still renders in both modes so the mobile user sees exactly
// what they'll get, they just don't drag it directly.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BADGE_ASPECT,
  BADGE_SOFT_WARNING_W,
  MAX_BADGE_W,
  MIN_BADGE_W,
  cornerBadgeRect,
  nearestCorner,
  resizeBadge,
  sliderResizeBadge,
  type BadgeCorner,
  type BadgeRect,
} from "@/lib/badge-resize";

const MOBILE_BREAKPOINT = 640;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

const CORNER_LABELS: Record<BadgeCorner, string> = {
  "bottom-right": "Bottom right",
  "bottom-left": "Bottom left",
  "top-right": "Top right",
  "top-left": "Top left",
};

// Render order for the mobile 2x2 grid — SPATIAL, deliberately not
// Object.keys(CORNER_LABELS) (2026-08-13, direct report: "the buttons, left
// and right, are not actually on the matching left and right, and the top
// and bottom are also switched around").
//
// That's exactly what it was doing. CORNER_LABELS is declared
// bottom-right/bottom-left/top-right/top-left — bottom-right first because
// it's the default — and mapping those keys straight into `grid-cols-2`
// produced:
//
//     [Bottom right] [Bottom left]
//     [Top right]    [Top left]
//
// i.e. mirrored on BOTH axes: "Bottom" in the top row, "right" in the left
// column. The control panel was a mirror image of the page it controls, so
// reaching for the top-left button gave you a bottom-right badge. Not
// intentional — nobody picked that arrangement, it fell out of the order the
// labels happened to be typed in.
//
// The labels themselves were always truthful and cornerBadgeRect() places
// correctly (see badge-resize.ts) — this was purely where the buttons sat,
// which is why it reads as "switched around" rather than as broken output.
// Explicit array so the grid can only ever match the page.
const CORNER_GRID: BadgeCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

export function BadgePlacer({
  file,
  initialRect,
  onSave,
  onCancel,
  showPaymentLink,
  paymentLinkUrl,
  paymentLabel,
  onPaymentLinkChange,
  onPaymentLabelChange,
}: {
  file: File;
  initialRect: BadgeRect;
  onSave: (rect: BadgeRect) => void;
  onCancel: () => void;
  showPaymentLink: boolean;
  paymentLinkUrl: string;
  paymentLabel: string;
  onPaymentLinkChange: (value: string) => void;
  onPaymentLabelChange: (value: string) => void;
}) {
  const isMobile = useIsMobile();
  const [rect, setRect] = useState<BadgeRect>(initialRect);
  const [pageImage, setPageImage] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; orig: BadgeRect } | null>(null);

  // Render page 1 of the local file — see file header comment for why this
  // doesn't go through the server (no document exists yet at this point).
  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const { installMapUpsertPolyfill } = await import("@/lib/pdfjs-map-polyfill");
        installMapUpsertPolyfill();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.polyfill.mjs";
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setPageImage({ dataUrl: canvas.toDataURL(), width: viewport.width, height: viewport.height });
          setLoading(false);
        }
      } catch (err) {
        console.error("Badge Placer: failed to render PDF preview", err);
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [file]);

  function handleBoxPointerDown(e: React.PointerEvent) {
    if (isMobile) return; // mobile uses the corner+slider panel, not drag
    e.stopPropagation();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: rect.x, origY: rect.y };

    function onMove(moveEvent: PointerEvent) {
      const drag = dragState.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      const bounds = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - drag.startX) / bounds.width;
      const dy = (moveEvent.clientY - drag.startY) / bounds.height;
      const height = rect.width * BADGE_ASPECT;
      const nextX = Math.min(Math.max(drag.origX + dx, 0), 1 - rect.width);
      const nextY = Math.min(Math.max(drag.origY + dy, 0), 1 - height);
      setRect((prev) => ({ ...prev, x: nextX, y: nextY }));
    }
    function onUp() {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function handleResizePointerDown(e: React.PointerEvent) {
    if (isMobile) return;
    e.stopPropagation();
    const orig = rect;
    const start = { x: e.clientX, y: e.clientY };

    function onMove(moveEvent: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - start.x) / bounds.width;
      const dy = (moveEvent.clientY - start.y) / bounds.height;
      setRect(resizeBadge({ orig, dx, dy }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function tapCorner(corner: BadgeCorner) {
    setRect(cornerBadgeRect(corner, rect.page, rect.width));
  }

  function onSliderChange(width: number) {
    setRect((prev) => sliderResizeBadge(prev, width));
  }

  const tooSmall = rect.width < BADGE_SOFT_WARNING_W;
  const activeCorner = isMobile ? nearestCorner(rect) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Place badge</p>
        <button type="button" onClick={onCancel} aria-label="Close" className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {isMobile
          ? "Tap a corner, then use the slider to size it."
          : "Drag the badge to reposition it, or drag its corner to resize."}
      </p>

      <div
        ref={containerRef}
        data-page-canvas
        className="relative mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        style={{ aspectRatio: pageImage ? `${pageImage.width} / ${pageImage.height}` : "612 / 792" }}
      >
        {loading && <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading preview…</div>}
        {loadError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-slate-400">
            Couldn&apos;t preview this file, but placement still works — position is saved either way.
          </div>
        )}
        {pageImage && (
          // eslint-disable-next-line @next/next/no-img-element -- local canvas data URL, not a static/remote asset
          <img src={pageImage.dataUrl} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
        )}
        {!loading && (
          <div
            onPointerDown={handleBoxPointerDown}
            className={cn(
              "absolute border-2 border-dashed border-yellow-500 bg-yellow-400/25 touch-none",
              !isMobile && "cursor-move"
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.width * BADGE_ASPECT * 100}%`,
            }}
          >
            {!isMobile && (
              <div
                onPointerDown={handleResizePointerDown}
                className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border border-white bg-yellow-600 touch-none"
              />
            )}
          </div>
        )}
      </div>

      {tooSmall && (
        <p className="mt-2 text-xs text-amber-600">This may be too small to scan reliably from a phone camera.</p>
      )}

      {isMobile && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {CORNER_GRID.map((corner) => (
              <button
                key={corner}
                type="button"
                onClick={() => tapCorner(corner)}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  activeCorner === corner
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {CORNER_LABELS[corner]}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="badge-size-slider" className="text-xs">
              Size
            </Label>
            <input
              id="badge-size-slider"
              type="range"
              min={MIN_BADGE_W}
              max={MAX_BADGE_W}
              step={0.005}
              value={rect.width}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {showPaymentLink && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          <Label htmlFor="badge-payment-link">Payment link (optional)</Label>
          <Input
            id="badge-payment-link"
            placeholder="https://buy.stripe.com/..."
            value={paymentLinkUrl}
            onChange={(e) => onPaymentLinkChange(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Shown as a separate, clearly-labeled QR — never merged with the verification badge above.
          </p>
          {paymentLinkUrl && (
            <Input
              placeholder="Label (optional, e.g. 'Pay invoice #204')"
              value={paymentLabel}
              onChange={(e) => onPaymentLabelChange(e.target.value)}
              className="mt-1.5"
            />
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="button" className="flex-1" onClick={() => onSave(rect)}>
          Save position
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
