"use client";

// Dark-themed siblings of ShareLinkButton/QrLinkButton (share-link-button.tsx,
// qr-link-button.tsx) for Console's two private CopyLinkButton call sites
// (console-chat.tsx's sealed-message row, console-verified-badge-list.tsx's
// history rows) — both already sit next to an "Open verify page"/"Verify
// page" outline pill styled `border-white/10 ... text-neutral-300
// hover:bg-white/5`, so these match that instead of the light dashboard's
// buttonVariants outline pill. Housekeeping, 2026-08-07: those two call
// sites were the last copy-link buttons in the app without a Share/QR
// option next to them (dashboard's sealed-doc row and the signer row both
// got theirs already).
//
// One shared pair rather than 4 separate components -- the two call sites
// only differ in size (console-chat.tsx's is a hair larger than console-
// verified-badge-list.tsx's, matching each file's own CopyLinkButton), so
// a `size` prop covers it instead of forking the whole component twice.
//
// Same "always render, try navigator.share at click time, fall back to
// clipboard" pattern as every other Share button this session -- see
// share-link-button.tsx's comment for why no render-time feature
// detection.
import { useState } from "react";
import QRCode from "qrcode";
import { Share2, QrCode, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { pill: "px-3 py-1.5 text-sm", icon: "h-3.5 w-3.5" },
  xs: { pill: "px-2.5 py-1 text-xs", icon: "h-3 w-3" },
} as const;

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 font-medium text-neutral-300 hover:bg-white/5";

export function ConsoleShareLinkButton({
  link,
  shareText,
  label = "Share",
  size = "sm",
}: {
  link: string;
  shareText?: string;
  label?: string;
  size?: keyof typeof SIZES;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "SignedBy", text: shareText, url: link });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op -- nothing more useful to do
    }
  }

  return (
    <button type="button" onClick={handleShare} className={cn(PILL_BASE, SIZES[size].pill)}>
      <Share2 className={SIZES[size].icon} aria-hidden="true" />
      {copied ? "Copied" : label}
    </button>
  );
}

// Default label renamed from plain "QR code" to "Share by QR code" (2026-08-08,
// direct ask, matching qr-link-button.tsx's own rename) -- reads as a third
// sharing option alongside ConsoleShareLinkButton's "Share" rather than an
// unrelated label.
export function ConsoleQrLinkButton({
  link,
  caption,
  label = "Share by QR code",
  size = "sm",
}: {
  link: string;
  caption?: string;
  label?: string;
  size?: keyof typeof SIZES;
}) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (dataUrl || error) return;
    try {
      const url = await QRCode.toDataURL(link, {
        width: 220,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffffff" },
      });
      setDataUrl(url);
    } catch {
      setError(true);
    }
  }

  return (
    <span className="relative inline-block">
      <button type="button" onClick={handleOpen} className={cn(PILL_BASE, SIZES[size].pill)}>
        <QrCode className={SIZES[size].icon} aria-hidden="true" />
        {label}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          {/* Popover itself stays light regardless of Console's dark theme
              -- a white background with dark modules is what actually
              scans reliably, same reasoning a dark-mode site still prints
              its QR codes on white. */}
          <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Scan to open</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center">
              {dataUrl ? (
                // A locally-generated data: URI, not a remote image --
                // next/image would gain nothing here and can't optimize a
                // data URI anyway.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="QR code for this link" width={220} height={220} />
              ) : error ? (
                <p className="py-8 text-center text-xs text-red-600">Couldn&apos;t generate a QR code.</p>
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-slate-400">
                  Generating…
                </div>
              )}
            </div>
            {caption && <p className="mt-1 text-center text-[11px] text-slate-500">{caption}</p>}
          </div>
        </>
      )}
    </span>
  );
}
