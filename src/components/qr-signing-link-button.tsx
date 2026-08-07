"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";

// Second "get this link onto a phone" option alongside ShareSigningLinkButton
// (see WHATSAPP_SIGNING_LINK_SCOPE.md's delivery-options discussion,
// 2026-08-07) -- covers the case Share doesn't: sender and signer are
// physically together (or on a screen-share) and the signer can just scan
// with their own camera, no app-picker hand-off needed. Reuses the same
// `qrcode` package already used server-side for the Verified Badge
// (badge-asset.tsx), same brand colors, just generated client-side here
// since the link is already known in the browser -- no new API route,
// no auth surface, nothing server-side to add.
export function QrSigningLinkButton({ signingToken }: { signingToken: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (dataUrl || error) return; // already generated (or failed) once -- don't regenerate every open
    try {
      const link = `${window.location.origin}/sign/${signingToken}`;
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
        className="text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        QR code
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
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
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
                <img src={dataUrl} alt="QR code for this signer's signing link" width={220} height={220} />
              ) : error ? (
                <p className="py-8 text-center text-xs text-red-600">Couldn&apos;t generate a QR code.</p>
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-slate-400">
                  Generating…
                </div>
              )}
            </div>
            <p className="mt-1 text-center text-[11px] text-slate-500">
              Their camera opens the same signing link — no app to hand over.
            </p>
          </div>
        </>
      )}
    </span>
  );
}
