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
// Fix (per Supabase's own docs, "Option 2" under email prefetching): the email
// link points here with the real confirmation link passed as a query param
// instead. This page never auto-follows it — it just shows a button. A scanner
// that only fetches the URL (not execute JS or click things) never consumes
// the token; only a human clicking "Continue" does.
export default function ConfirmPage() {
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "missing">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("confirmation_url");
    if (url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of the URL query string, cannot be derived during render/SSR
      setConfirmUrl(url);
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
