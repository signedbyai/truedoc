"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink, signInWithPassword, signUpWithPassword, sendPasswordReset } from "./actions";

type AuthView = "email" | "password";
type PasswordMode = "signin" | "signup" | "forgot";

// Google's official multi-color "G" mark — used at icon size for the social
// sign-in button, per Google's branding guidelines for "Sign in with Google".
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 010-4.54V6.62H1.27a12 12 0 000 10.76l4-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

// Microsoft's four-color square mark — used at icon size for the social
// sign-in button, per Microsoft's identity branding guidelines.
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

// Slim wrapper so useSearchParams (client-only) doesn't block static
// rendering of the rest of the page — Next requires a Suspense boundary
// around any component that reads the search string.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const isSignup = searchParams.get("intent") === "signup";

  const [view, setView] = useState<AuthView>("email");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);

  function resetStatus() {
    setStatus("idle");
    setMessage("");
  }

  function switchView(next: AuthView) {
    setView(next);
    setPasswordMode("signin");
    resetStatus();
  }

  function switchPasswordMode(next: PasswordMode) {
    setPasswordMode(next);
    resetStatus();
  }

  function handleMagicLink(formData: FormData) {
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("sent");
      }
    });
  }

  function handlePasswordSignIn(formData: FormData) {
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  function handlePasswordSignUp(formData: FormData) {
    startTransition(async () => {
      const result = await signUpWithPassword(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("sent");
        setMessage("Check your inbox to confirm your account, then sign in.");
      }
    });
  }

  function handleForgotPassword(formData: FormData) {
    startTransition(async () => {
      const result = await sendPasswordReset(formData);
      if (result?.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("sent");
        setMessage("Check your inbox for a password reset link.");
      }
    });
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setOauthLoading(null);
      setStatus("error");
      setMessage(error.message);
    }
    // On success the browser navigates away to the provider, so no further state change needed.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight text-slate-900">
        SignedBy
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup ? "Free to start — no credit card required." : "Sign in to continue to SignedBy."}
          </p>
        </div>

        {view === "email" ? (
          <div className="space-y-4">
            {status === "sent" ? (
              <p className="text-center text-sm text-slate-600">
                Check your inbox for a sign-in link. You can close this tab.
              </p>
            ) : (
              <form action={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input id="email" name="email" type="email" required placeholder="Email address" />
                </div>
                {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Sending…" : "Continue with email"}
                </Button>
              </form>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Google"
                title="Continue with Google"
                className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <GoogleIcon />
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("azure")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Microsoft"
                title="Continue with Microsoft"
                className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <MicrosoftIcon />
              </button>
            </div>

            <p className="text-center text-xs text-slate-500">
              <button type="button" onClick={() => switchView("password")} className="underline underline-offset-2">
                Use a password instead
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => switchView("email")}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              ← Use email link instead
            </button>

            {passwordMode === "signin" && (
              <form action={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-email">Email</Label>
                  <Input id="pw-email" name="email" type="email" required placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-password">Password</Label>
                  <Input id="pw-password" name="password" type="password" required placeholder="Your password" />
                </div>
                {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Signing in…" : "Sign in"}
                </Button>
                <div className="flex justify-between text-xs text-slate-500">
                  <button type="button" onClick={() => switchPasswordMode("signup")} className="underline underline-offset-2">
                    Create an account
                  </button>
                  <button type="button" onClick={() => switchPasswordMode("forgot")} className="underline underline-offset-2">
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {passwordMode === "signup" && (
              <form action={handlePasswordSignUp} className="space-y-4">
                {status === "sent" ? (
                  <p className="text-sm text-slate-600">{message}</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" name="email" type="email" required placeholder="you@company.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-password">Password</Label>
                      <Input
                        id="su-password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                      />
                    </div>
                    {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? "Creating account…" : "Create account"}
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => switchPasswordMode("signin")}
                  className="text-xs text-slate-500 underline underline-offset-2"
                >
                  Already have an account? Sign in
                </button>
              </form>
            )}

            {passwordMode === "forgot" && (
              <form action={handleForgotPassword} className="space-y-4">
                {status === "sent" ? (
                  <p className="text-sm text-slate-600">{message}</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="fp-email">Email</Label>
                      <Input id="fp-email" name="email" type="email" required placeholder="you@company.com" />
                    </div>
                    {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? "Sending…" : "Send reset link"}
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => switchPasswordMode("signin")}
                  className="text-xs text-slate-500 underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-slate-900 underline underline-offset-2">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to SignedBy?{" "}
            <Link href="/login?intent=signup" className="font-medium text-slate-900 underline underline-offset-2">
              Sign up free
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
