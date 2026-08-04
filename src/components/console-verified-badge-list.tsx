"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, FileText, ShieldCheck } from "lucide-react";

type SealedDocument = {
  id: string;
  title: string;
  sealedAt: string | null;
  hash: string | null;
  hasSignedFile: boolean;
  hasCertificateFile: boolean;
};

// Copy-link button, same shape as console-chat.tsx's own (private,
// unexported) CopyLinkButton — duplicated rather than imported since that
// one isn't exported and this list needs the exact same "flash Copied,
// never show the raw value" behavior for each row's verify link.
function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op — still flash "Copied", nothing more useful to do
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/5"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {copied ? "Copied" : "Copy verify link"}
    </button>
  );
}

/** Verified Badge tab in Console's sidebar (CONSOLE_VERIFIED_BADGE_FOCUS_
 *  REDESIGN_SCOPE.md, 2026-08-04) — replaces the old ConsoleTemplatesList.
 *  Lists this org's sealed documents and their outputs (verify link,
 *  sealed PDF, certificate, badge image), the same set console-chat.tsx's
 *  own `m.sealed` block already renders right after a seal — this is just
 *  the persistent "come back and find it later" home for that same data.
 *
 *  Real templates (save/reuse) have no tab here anymore — reachable only
 *  by asking the chat directly, per the redesign's decision to keep
 *  Console focused on Verified Badge as its one clear job. */
export function ConsoleVerifiedBadgeList() {
  const [items, setItems] = useState<SealedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/console/verified-badge")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data.documents) ? data.documents : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-neutral-600">
        Documents you&apos;ve sealed, and their outputs. Looking for a template instead? Just ask the console.
      </p>
      {items.map((doc) => {
        const verifyUrl = doc.hash ? `https://signedby.ai/verify?hash=${doc.hash}` : null;
        return (
          <div key={doc.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{doc.title}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {doc.sealedAt ? `Sealed ${new Date(doc.sealedAt).toLocaleDateString()}` : "Sealed"} · SHA-512
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                Verified
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {verifyUrl && (
                <>
                  <CopyLinkButton value={verifyUrl} />
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/5"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    Verify page
                  </a>
                </>
              )}
              {doc.hasSignedFile && (
                <a
                  href={`/api/documents/${doc.id}/signed-file`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/5"
                >
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  Sealed PDF
                </a>
              )}
              {doc.hasCertificateFile && (
                <a
                  href={`/api/documents/${doc.id}/certificate`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/5"
                >
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  Certificate
                </a>
              )}
              <a
                href={`/api/documents/${doc.id}/badge`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/5"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Badge
              </a>
            </div>
          </div>
        );
      })}
      {!loading && items.length === 0 && (
        <p className="px-1 py-2 text-xs text-neutral-600">
          No sealed documents yet — seal your first file to see it here.
        </p>
      )}
    </div>
  );
}
