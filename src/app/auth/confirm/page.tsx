"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Email security scanners (Gmail, Outlook Safe Links, corporate gateways) fetch
// every link in an email server-side to check for malware/phishing. If the real
// one-time sign-in link were placed directly in the email, that automated fetch
// consumes the single-use token before the person ever clicks it — causing
// "email link is invalid or has expired" and an apparent sign-in loop.
//
// Fix: the email link points here with the real link stashed in the URL
// fragment (the part after #). Fragments are never sent to a server — only
// JavaScript running in a real browser can read them. So automated scanners
// hitting this page server-side see nothing to fetch, while a human's browser
// extracts the real link and finishes sign-in with one click.
export default function ConfirmPage() {
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "missing">("idle");

  useEffect(() => {
    // Fragment is only ever available client-side (it's never sent to the
    // server, by design — that's the whole point of this page), so this has
    // to run post-mount. One-time read, no cascading updates follow.
    const hash = window.location.hash.slice(1);
    if (hash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of the URL fragment, cannot be derived during render/SSR
      setConfirmUrl(hash);
    } else {
      setStatus("missing");
    }
  }, []);

  function handleContinue() {
    if (!confirmUrl) return;
    setStatus("loading");
    window.location.href = confirmUrl;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Finish signing in</CardTitle>
          <CardDescription>
            {status === "missing"
              ? "This link is missing some information, so we can't complete sign-in."
              : "One click to confirm it's really you."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "missing" ? (
            <a href="/login" className="text-sm text-slate-900 underline underline-offset-2">
              Request a new sign-in link
            </a>
          ) : (
            <Button className="w-full" onClick={handleContinue} disabled={!confirmUrl || status === "loading"}>
              {status === "loading" ? "Signing in…" : "Continue"}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
