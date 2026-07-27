import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Email security scanners (Gmail, Outlook Safe Links, corporate gateways) fetch
// every link in an email server-side to check for malware/phishing. If the real
// one-time sign-in link were placed directly in the email, that automated fetch
// consumes the single-use token before the person ever clicks it — causing
// "email link is invalid or has expired" and an apparent sign-in loop.
//
// Fix (per Supabase's own docs, "Option 2" under email prefetching): the email
// link points here with the real confirmation link passed as a query param
// instead. A scanner that only fetches this page's HTML (without executing JS
// or clicking things) never consumes the token; only a human clicking
// "Continue" does.
//
// Deliberately a plain server component, not a client component with a
// useEffect + onClick handler (found 2026-07-26, root-caused a two-week
// collapse in signups: that version depended on client-side hydration
// completing before the button became clickable at all — when hydration
// didn't happen for a visitor, for whatever reason, the button sat there
// permanently disabled with zero error or feedback, silently killing the
// entire signup funnel from the confirmation-email step onward). The
// confirmation_url query param is already available at request time, so
// this reads it server-side and renders a plain <a> styled as a button —
// nothing here depends on client JS ever running.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation_url?: string }>;
}) {
  const { confirmation_url } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Finish signing in</CardTitle>
          <CardDescription>
            {confirmation_url
              ? "One click to confirm it's really you."
              : "This link is missing some information, so we can't complete sign-in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmation_url ? (
            <a href={confirmation_url} className={cn(buttonVariants(), "w-full")}>
              Continue
            </a>
          ) : (
            <a href="/login" className="text-sm text-slate-900 underline underline-offset-2">
              Request a new sign-in link
            </a>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
