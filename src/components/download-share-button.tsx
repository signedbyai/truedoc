"use client";

// Drop-in replacement for a plain `<a download>` file-download button
// (round 2 fix: cfb2147 + 67d4ddb, IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md).
// That fix made the download itself reliable, but it's still a *silent*
// background save on mobile — iOS in particular gives no on-screen
// confirmation or "open" affordance, so the user has to go hunting through
// the Files app for something they just tapped a button for. Direct report,
// 2026-08-10.
//
// Fix: fetch the file client-side into a blob, then hand that blob to
// navigator.share() as a real File. That's what pops the native OS
// share/open sheet — "Open in Preview/Files/Mail/...", "Save to Files" —
// with the actual file attached. Because this shares a File object, not a
// URL, it can't regress into the original bug (sharing the raw API URL
// instead of the file) — there's no URL in the share payload at all.
//
// Feature-detected at click time via navigator.canShare, same "try it, fall
// back if unsupported" pattern as share-link-button.tsx — desktop browsers
// and anything without the File-sharing extension to the Web Share API fall
// straight through to the same blob-URL anchor-click download the old
// plain `<a download>` did, so nothing regresses there either.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DownloadShareButton({
  href,
  filename,
  mimeType = "application/pdf",
  className,
  children,
}: {
  href: string;
  filename: string;
  mimeType?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: mimeType });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (err) {
          // AbortError == the user closed the share sheet themselves --
          // respect that silently, same as ShareLinkButton. Any other
          // failure falls through to the plain-save path below instead of
          // leaving the tap looking like it did nothing.
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // Last-resort fallback -- direct navigation to the route itself,
      // same behavior the plain <a> had before this component existed.
      // Worse UX (relies on Content-Disposition alone, no share sheet) but
      // strictly no worse than doing nothing.
      window.location.href = href;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={cn(className, loading && "opacity-60")}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
