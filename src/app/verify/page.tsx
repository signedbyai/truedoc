"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consoleAppUrl } from "@/lib/console-host";

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
      timestampTsa: "sectigo" | "eurotsa" | "freetsa" | null;
      timestampGenTime: string | null;
      paymentLinkUrl: string | null;
      paymentLabel: string | null;
    }
  | { verified: false }
  | null;

// RFC 3161 trusted timestamp (TIMESTAMP_AUTHORITY_SCOPE.md, 2026-08-03;
// EuroTSA tier added 2026-08-12, EUROTSA_SCOPE.md). Sectigo chains to an
// already-trusted root, so a Sectigo-backed timestamp needs no caveat.
// EuroTSA and FreeTSA both use a self-signed CA — real RFC 3161 proof, but
// independently re-verifying either (rather than trusting SignedBy's own
// report here) requires manually installing that TSA's own root certificate
// first, so that nuance has to stay visible rather than implying all three
// are equivalent. (EuroTSA being SignedBy's own EU-hosted infrastructure
// doesn't change its trust model — it's a dependency-risk improvement over
// FreeTSA, not a stronger evidentiary claim.)
const TSA_LABELS: Record<"sectigo" | "eurotsa" | "freetsa", string> = {
  sectigo: "Sectigo (RFC 3161)",
  eurotsa: "EuroTSA (RFC 3161)",
  freetsa: "FreeTSA (RFC 3161)",
};

function TimestampRow({ tsa, genTime }: { tsa: "sectigo" | "eurotsa" | "freetsa"; genTime: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-emerald-700">Trusted timestamp</dt>
      <dd className="text-right font-medium">
        {TSA_LABELS[tsa]}
        {genTime && <span className="block text-xs font-normal text-emerald-700">{new Date(genTime).toLocaleString()}</span>}
        {(tsa === "freetsa" || tsa === "eurotsa") && (
          <span className="block text-xs font-normal text-emerald-700">
            Independently re-verifying this token requires installing {tsa === "eurotsa" ? "EuroTSA's" : "FreeTSA's"} root certificate.
          </span>
        )}
      </dd>
    </div>
  );
}

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const [hash, setHash] = useState(() => searchParams.get("hash") || "");
  // ?from=console (2026-08-05, direct bug report: "the link to the
  // verification site, when it comes from console, the back to SignedBy
  // takes you out of console") — this page always lives on the main
  // appUrl() domain, never console.signedby.ai, so a plain "/" back link
  // dropped someone at the marketing homepage instead of back to their
  // console session. Tagged onto the verifyUrl by verified-badge-actions.ts
  // and console-verified-badge-list.tsx, both genuinely console-only
  // sources.
  //
  // ?from=dashboard&doc=<id> (2026-08-10, same bug class, direct report:
  // "when you go there from the seal a document output, the back button
  // takes you out all the way to the pre-login home page") — the dashboard
  // document page's own verify links (the header link, the certificate-
  // preview card, and every Copy/Share/QR/Open-page option in
  // SealedDocumentOutputs, which all share one verifyUrl string) were still
  // using the same plain "/" link this page falls back to by default. A
  // logged-in sender clicking "← SignedBy" from there landed on the logged-
  // out marketing homepage instead of back on their own document — same
  // root cause as the console case, just never tagged for this source.
  // Goes to the SPECIFIC document (not just a bare "/dashboard") since the
  // id is already available at both call sites building this link.
  //
  // The signer's own completed screen (signing-view.tsx) and any QR-code/
  // badge scan stay on the plain "/" link deliberately — neither has a
  // dashboard session to return to, so the marketing homepage genuinely is
  // the right destination for those, same reasoning as before.
  const from = searchParams.get("from");
  const backDocId = searchParams.get("doc");
  const backHref =
    from === "console" ? consoleAppUrl() : from === "dashboard" && backDocId ? `/dashboard/documents/${backDocId}` : "/";
  const backLabel = from === "console" ? "← Back to console" : from === "dashboard" && backDocId ? "← Back to document" : "← SignedBy";
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
        <Link href={backHref} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          {backLabel}
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
              {result.timestampTsa && <TimestampRow tsa={result.timestampTsa} genTime={result.timestampGenTime} />}
              {result.orgName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700">Organization</dt>
                  <dd className="text-right font-medium">{result.orgName}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-emerald-700">
              {result.timestampTsa
                ? // Honest only once a real RFC 3161 token exists for this
                  // document — see TimestampRow above for the
                  // Sectigo/FreeTSA distinction, which still applies.
                  "This confirms the file existed, unaltered, as of a cryptographically verified timestamp, sealed by a"
                : "This confirms the file existed, unaltered, as of the sealed timestamp above, sealed by a"}{" "}
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
              {result.timestampTsa && <TimestampRow tsa={result.timestampTsa} genTime={result.timestampGenTime} />}
              {result.orgName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-emerald-700">Sent via</dt>
                  <dd className="text-right font-medium">{result.orgName}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* "Pay this invoice" — IN_DOCUMENT_BADGE_AND_API_SEAL_SCOPE.md
            V1.5, own hard constraint: visually and structurally separate
            from the verification card above, own color (blue, not the
            verification card's emerald), own border style, own QR, own
            label — never implying "scan this to verify" also means "this
            is safe to pay." Only rendered when the sender actually set a
            payment_link_url on this document (Business tier — gated at
            write time, not re-checked here). */}
        {result && result.verified && result.paymentLinkUrl && (
          <div className="mt-4 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">{result.paymentLabel || "Pay this invoice"}</p>
            <p className="mt-1 text-xs text-blue-700">
              Not required to verify this document — a separate, optional link the sender added.
            </p>
            <div className="mt-3 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated by /api/payment-qr (next/og ImageResponse) */}
              <img
                src={`/api/payment-qr?hash=${hash}`}
                alt="Scan to pay"
                width={300}
                height={130}
                className="h-auto w-36 shrink-0 rounded border border-blue-200"
              />
              <a href={result.paymentLinkUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-800 underline hover:text-blue-900">
                Open payment link
              </a>
            </div>
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
