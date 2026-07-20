"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Per-recipient authentication (Business tier, PER_RECIPIENT_AUTH_SCOPE.md):
// rendered by sign/[token]/page.tsx INSTEAD of the document whenever a
// signer's recipient row has auth_required set and they haven't verified
// yet. Requests a code on mount, then verifies it; on success calls
// router.refresh() so the server component re-evaluates
// signer.auth_verified_at and renders the normal signing flow — no client-
// side state duplicates what the server already knows.
export function SignerAuthGate({
  token,
  documentTitle,
  logo,
}: {
  token: string;
  documentTitle: string;
  logo?: { url: string; alt: string };
}) {
  const router = useRouter();
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [requesting, setRequesting] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(false);

  async function requestCode() {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch(`/api/sign/${token}/auth/request`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send a code. Try again.");
      if (data.alreadyVerified) {
        router.refresh();
        return;
      }
      setMaskedEmail(data.maskedEmail || null);
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 30_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send a code. Try again.");
    } finally {
      setRequesting(false);
    }
  }

  // Deferred via Promise.resolve().then(...) rather than calling requestCode
  // directly in the effect body — same react-hooks/set-state-in-effect
  // workaround used elsewhere in this codebase (see field-editor.tsx's
  // auto-suggest effect) since requestCode's first line is a synchronous
  // setState. Intentionally run-once-on-mount only (requestCode is
  // recreated every render but must not re-fire the effect).
  useEffect(() => {
    Promise.resolve().then(() => requestCode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyCode() {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`/api/sign/${token}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code wasn't right.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code wasn't right.");
      setVerifying(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200/60 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.url} alt={logo.alt} className="mx-auto mb-4 h-10 w-auto max-w-[180px] rounded object-contain" />
        )}
        <h1 className="text-lg font-semibold text-slate-900">Confirm it&apos;s you</h1>
        <p className="mt-2 text-sm text-slate-600">
          {requesting && !maskedEmail
            ? `Sending a verification code before you can open "${documentTitle}"…`
            : maskedEmail
              ? `We sent a code to ${maskedEmail}. Enter it below to open "${documentTitle}".`
              : `Enter the code we sent you to open "${documentTitle}".`}
        </p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyCode()}
          placeholder="000000"
          className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2.5 text-center text-2xl tracking-[0.5em] text-slate-900"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={verifyCode}
          disabled={code.length !== 6 || verifying || requesting}
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifying ? "Checking…" : "Continue"}
        </button>

        <button
          onClick={requestCode}
          disabled={requesting || resendCooldown}
          className="mt-3 text-xs text-slate-500 underline hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
        >
          {requesting ? "Sending…" : "Resend code"}
        </button>
      </div>
    </main>
  );
}
