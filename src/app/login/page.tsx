"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink, signInWithPassword, signUpWithPassword, sendPasswordReset } from "./actions";

type AuthMethod = "magiclink" | "password";
type PasswordMode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [method, setMethod] = useState<AuthMethod>("magiclink");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  function resetStatus() {
    setStatus("idle");
    setMessage("");
  }

  function switchMethod(next: AuthMethod) {
    setMethod(next);
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

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleLoading(false);
      setStatus("error");
      setMessage(error.message);
    }
    // On success the browser navigates away to Google, so no further state change needed.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to SignedBy</CardTitle>
          <CardDescription>
            {method === "magiclink" && "We'll email you a magic link — no password needed."}
            {method === "password" && passwordMode === "signin" && "Sign in with your email and password."}
            {method === "password" && passwordMode === "signup" && "Create an account with an email and password."}
            {method === "password" && passwordMode === "forgot" && "We'll email you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex rounded-md border border-slate-200 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => switchMethod("magiclink")}
              className={`flex-1 rounded-sm py-1.5 transition-colors ${
                method === "magiclink" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Magic link
            </button>
            <button
              type="button"
              onClick={() => switchMethod("password")}
              className={`flex-1 rounded-sm py-1.5 transition-colors ${
                method === "password" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Password
            </button>
          </div>

          {method === "magiclink" &&
            (status === "sent" ? (
              <p className="text-sm text-slate-600">Check your inbox for a sign-in link. You can close this tab.</p>
            ) : (
              <form action={handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@company.com" />
                </div>
                {status === "error" && <p className="text-sm text-red-600">{message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Sending…" : "Send magic link"}
                </Button>
              </form>
            ))}

          {method === "password" && passwordMode === "signin" && (
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

          {method === "password" && passwordMode === "signup" && (
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

          {method === "password" && passwordMode === "forgot" && (
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
        </CardContent>
      </Card>
    </main>
  );
}
