"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result =
  | {
      verified: true;
      title: string;
      completedAt: string;
      signerCount: number;
      orgName: string | null;
      isVerifiedBadge: boolean;
      sealedBy: string | null;
      identityVerifiedAt: string | null;
    }
  | { verified: false }
  | null;

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const [hash, setHash] = useState(() => searchParams.get("hash") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);

  async function runCheck(value: string) {
    // Strip ALL whitespace, not just leading/trailing -- copy-pasting from
    // a PDF viewer can pick up a stray space or line break in the middle
    // of the string (e.g. selecting across a line wrap), which .trim()
    // alone wouldn't catch and would otherwise fail validation.
    const trimmed = value.replace(/\s+/g, "").toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/verify?hash=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-check if a hash was passed in via ?hash=... (e.g. from a link on
  // the certificate page, once that's clickable rather than plain text).
  useEffect(() => {
    const fromUrl = searchParams.get("hash");
    // Deferred to a microtask so the state updates inside runCheck (loading,
    // result, etc.) don't happen synchronously within the effect itself.
    if (fromUrl) {
      Promise.resolve().then(() => runCheck(fromUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← SignedBy
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Verify a document</h1>
        <p className="mt-2 text-sm text-slate-600">
          Every document signed with SignedBy gets a Certificate of Completion page with a checksum. Paste that
          checksum below to independently confirm it&apos;s genuine — no account needed.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          {/* Accepts either a 64-char SHA-256 checksum (certificates issued
              before the SHA-512 switch) or a 128-char SHA-512 checksum
              (every one since) — see /api/verify/route.ts. */}
          <label className="text-xs font-medium text-slate-600">Document checksum</label>
          <Input
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Paste the checksum from your Certificate of Completion page"
            className="mt-1.5 font-mono text-xs"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button onClick={() => runCheck(hash)} disabled={loading || !hash.trim()} className="mt-3 w-full">
            {loading ? "Checking…" : "Verify"}
          </Button>
        </div>

        {result && result.verified && result.isVerifiedBadge && (
          // Verified Badge framing (VERIFIED_BADGE_SCOPE.md) — the signing
          // individual's name is the headline claim, not a signer count,
          // since every Badge has exactly one real, verified signer behind
          // it. "Sealed" and "Identity verified" are shown as two distinct
          // facts/dates, not one combined claim — the identity check may
          // have been reused from an earlier verified session rather than
          // performed fresh for this specific file.
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-800">✓ Sealed and identity-verified</p>
            {result.sealedBy && <p className="mt-1 text-base font-semibold text-emerald-900">{result.sealedBy}</p>}
            <dl className="mt-3 space-y-1.5 text-sm text-emerald-900">
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">File</dt>
                <dd className="text-right font-medium">{result.title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Sealed</dt>
                <dd className="text-right font-medium">{new Date(result.completedAt).toLocaleString()}</dd>
              </div>
              {result.identityVerifiedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700">Identity verified</dt>
                  <dd className="text-right font-medium">{new Date(result.identityVerifiedAt).toLocaleDateString()}</dd>
                </div>
              )}
              {result.orgName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700">Organization</dt>
                  <dd className="text-right font-medium">{result.orgName}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-emerald-700">
              This confirms the file existed, unaltered, as of the sealed timestamp above, sealed by a
              verified individual. It doesn&apos;t certify the file&apos;s contents weren&apos;t AI-generated —
              only that it hasn&apos;t changed since this timestamp.
            </p>
          </div>
        )}

        {result && result.verified && !result.isVerifiedBadge && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-800">✓ This document is genuine</p>
            <dl className="mt-3 space-y-1.5 text-sm text-emerald-900">
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Title</dt>
                <dd className="text-right font-medium">{result.title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Completed</dt>
                <dd className="text-right font-medium">{new Date(result.completedAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-emerald-700">Signers</dt>
                <dd className="text-right font-medium">{result.signerCount}</dd>
              </div>
              {result.orgName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700">Sent via</dt>
                  <dd className="text-right font-medium">{result.orgName}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {result && !result.verified && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-800">✗ No match found</p>
            <p className="mt-1 text-sm text-red-700">
              This checksum doesn&apos;t match any completed document in SignedBy&apos;s records. Double-check it was copied
              exactly from the certificate page.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageInner />
    </Suspense>
  );
}
