"use client";

// Generic sibling of QrSigningLinkButton (signer-row.tsx) for a
// plain resolved absolute URL known at render time -- see
// share-link-button.tsx's own comment for why this is a separate small
// component rather than a generalized version of the signer one. Styled
// to match CopyLinkButton's outline-pill row rather than signer-row's
// plain-text-link style.
import { useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Default label renamed from plain "QR code" to "Share by QR code" (2026-08-08,
// direct ask) -- reads as a third sharing option alongside "Share verify
// link" (ShareLinkButton) rather than an unrelated label.
export function QrLinkButton({
  link,
  caption,
  label = "Share by QR code",
}: {
  link: string;
  caption?: string;
  label?: string;
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
      <button
        type="button"
        onClick={handleOpen}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
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
