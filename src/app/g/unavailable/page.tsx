// Fallback destination for a /g/[code] visit that isn't valid yet — an
// unrecognized code, or (far more commonly) a signer clicking their DocGate
// link before the *whole* document is completed. Kept as a plain static
// page, not StatusScreen (src/app/sign/[token]/page.tsx), since this route
// has no signer/org context to look up a branding-aware growth CTA against.
export default function DocGateUnavailablePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200/60 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
        <h1 className="text-lg font-semibold text-slate-900">Link not available yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          This link isn&apos;t valid, or the document it&apos;s attached to hasn&apos;t been signed by everyone yet.
          If you were expecting access, check back once every party has signed, or contact the sender.
        </p>
      </div>
    </main>
  );
}
