import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlagValues } from "flags/react";
import { ArrowUp, Paperclip } from "lucide-react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";
import { isConsoleHost, consoleUrl } from "@/lib/console-host";
import { getUserAndOrg } from "@/lib/org";
import { planHasFeature } from "@/lib/plan";

const TITLE = "SignedBy Console — use your favorite AI to send signing requests";
const DESCRIPTION =
  "Signing infra made for Europe. Wire an AI agent, CRM, or app into SignedBy's metered API — no separate developer plan, no per-seat tax. Requires the Pro plan or higher.";

// Own opengraph-image.tsx (route-scoped) — same pattern as /developers,
// so openGraph/twitter omit `images` and let Next auto-merge the file
// convention instead of pointing at the root shared image.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/console" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/console" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Terminal-window chrome around the curl examples — dot row + monospace
// green-on-black body, the one unambiguously "console" visual cue this
// page didn't have before (2026-07-30: page read as just another white
// marketing page despite the product being API/agent-facing).
function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/60">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-emerald-400">
        {children}
      </pre>
    </div>
  );
}

const FOOTER_LINKS = (
  <p className="mt-2 space-x-4">
    <Link href="/developers" className="hover:text-slate-300">
      API docs
    </Link>
    <Link href="/vs/docusign" className="hover:text-slate-300">
      SignedBy vs DocuSign
    </Link>
    <Link href="/pricing" className="hover:text-slate-300">
      Pricing
    </Link>
    <Link href="/security" className="hover:text-slate-300">
      Security
    </Link>
    <Link href="/terms" className="hover:text-slate-300">
      Terms
    </Link>
    <Link href="/privacy" className="hover:text-slate-300">
      Privacy
    </Link>
  </p>
);

export default async function ConsolePage() {
  const ctaColor = await ctaColorFlag();

  // This page renders two ways: rewritten to console.signedby.ai's root
  // (see middleware.ts) and directly at signedby.ai/console (kept for SEO
  // — see the canonical/openGraph url above). On the subdomain, relative
  // links already stay there. Reached via the main domain, though, "Sign
  // in"/"Start for free" need to actually jump the browser off to
  // console.signedby.ai — per direct instruction 2026-07-30, the whole
  // point of the subdomain-separation work is that the console app is
  // reached by really leaving signedby.ai, not by an internal route that
  // happens to render similar content.
  const onConsoleHost = isConsoleHost((await headers()).get("host"));
  const loginHref = onConsoleHost ? "/login?next=/app" : consoleUrl("/login?next=/app");
  const signupHref = onConsoleHost
    ? "/login?intent=signup&next=/app"
    : consoleUrl("/login?intent=signup&next=/app");

  // Skip the pitch for someone who's already signed in and already has
  // access — direct instruction (2026-07-31): typing console.signedby.ai
  // while already logged in (the cookie is shared across *.signedby.ai,
  // see cookie-domain.ts) shouldn't dead-end on the CTA page they've
  // already converted from. Scoped to the console host only — reached via
  // signedby.ai/console instead, this stays the stable, crawlable
  // marketing page (see the canonical/openGraph url above), same as
  // before. Also scoped to orgs that actually have access: a logged-in
  // Free-plan org still sees the upsell pitch rather than bouncing straight
  // to a page that would just redirect them to Settings.
  if (onConsoleHost) {
    const ctx = await getUserAndOrg();
    if (ctx) {
      const { data: org } = await ctx.supabase.from("organizations").select("plan").eq("id", ctx.orgId).single();
      if (org && (planHasFeature(org.plan, "apiAccess") || planHasFeature(org.plan, "consoleAccess"))) {
        redirect("/app");
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          {/* White-on-clear lockup, same real asset as console/app/layout.tsx
              (2026-07-31) — was previously the black-wordmark PNG wrapped in
              a white chip, then briefly a code-recreated white version until
              this actual white-knockout PNG was found in brand-assets/. */}
          <Image
            src="/brand/signedby-lockup-white-beta-micro-small-transparent.png"
            alt="SignedBy"
            width={266}
            height={64}
            className="h-6 w-auto"
            priority
          />
        </Link>
        <Link href={loginHref} className="text-sm font-medium text-slate-300 hover:text-white">
          Sign in
        </Link>
      </header>

      {/* Same radial-gradient treatment as /signedby-ai's hero, per direct
          instruction to borrow that page's dark, launch-moment look
          instead of reading as another plain white marketing page. */}
      <section className="bg-[radial-gradient(900px_600px_at_88%_-10%,#713f12_0%,#0f172a_55%)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
          <span className="rounded-full border border-yellow-300/35 bg-yellow-300/10 px-3 py-1 font-mono text-xs font-semibold text-yellow-300">
            console.signedby.ai
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            Send contracts from a{" "}
            <span className="rounded-[3px] bg-yellow-300 px-1.5 text-slate-900">prompt.</span>
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            SignedBy AI lets you control SignedBy directly from a prompt — pick templates, send documents in bulk
            and check signing status without opening a dashboard.
          </p>
          <CtaLink href={signupHref} color={ctaColor} page="console" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-500">
            Requires the Pro plan or higher (templates access). Free to sign up and try the rest of SignedBy first.
          </p>
        </div>
      </section>

      {/* Hero visual (2026-07-31, direct instruction): the same "product
          frame with the signer's phone overlapping its bottom-right
          corner" convention used on the homepage (hero-field-editor.png)
          and /developers (a curl request/response terminal) — see those
          for the established pattern. This page's audience is neither a
          sender looking at the field editor nor a raw API caller, so the
          equivalent frame here is a mocked console chat exchange (an
          example prompt + the confirm-before-send reply), styled to match
          the real /console/app chat UI (console-chat.tsx: neutral-950
          canvas, neutral-800 user bubble, borderless assistant text,
          yellow Confirm button, pill input bar with paperclip/Mistral
          pill/send arrow) rather than a literal screenshot — there's no
          production screenshot of the (not-yet-deployed) chat to use, and
          this reads as more legible/reproducible than one would anyway.
          The phone overlay is the exact same asset + positioning as the
          other two pages: the signer's experience is identical no matter
          how the send was triggered. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-4 sm:pr-12">
        <div className="relative mx-auto max-w-[34rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-3 px-5 py-5">
              <div className="ml-auto max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-2.5 text-sm text-white">
                Send the NDA template to jane@acme.com
              </div>
              <div className="mr-auto max-w-[90%] text-sm leading-relaxed text-neutral-300">
                Sending the NDA Template to jane@acme.com — no fields need filling in, expires in 7 days. Confirm to
                send?
                <div className="mt-2 flex gap-2">
                  <span className="rounded-lg bg-yellow-300 px-3 py-1.5 text-xs font-semibold text-slate-900">
                    Confirm send
                  </span>
                  <span className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500">Cancel</span>
                </div>
              </div>
            </div>
            <div className="mx-5 mb-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900 px-3 py-2.5">
              <Paperclip className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
              <span className="flex-1 truncate text-sm text-neutral-500">Ask to list or find a template…</span>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                Mistral
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-slate-900">
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="absolute -bottom-6 right-0 w-[30%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:-right-6 sm:w-[28%] lg:-right-10 lg:w-[30%]">
            <Image
              src="/hero-signer-mobile.png"
              alt="The signer's side of the same send: a handwritten signature drawn in the signature pad on a phone, with a yellow slide-to-sign bar ready to submit"
              width={1236}
              height={2370}
              sizes="(min-width: 1024px) 12rem, (min-width: 640px) 11rem, 30vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 border-t border-white/10 px-6 py-10 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-semibold text-slate-100">Pro plan minimum</p>
          <p className="mt-1 text-xs text-slate-400">
            Console access needs template access, same gate as templates themselves — no separate approval.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-semibold text-slate-100">Fully metered</p>
          <p className="mt-1 text-xs text-slate-400">
            20 document-sends free every month, then billed per document beyond that — on every plan, Business
            included.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-semibold text-slate-100">EU-based, EEA processing</p>
          <p className="mt-1 text-xs text-slate-400">
            SPRK10 B.V. is a Dutch entity; documents are processed within the EEA. See{" "}
            <Link href="/security" className="underline hover:text-white">
              Security
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-3xl scroll-mt-8 border-t border-white/10 px-6 py-10">
        <h2 className="text-xl font-semibold text-slate-100">Pricing</h2>
        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <p>
            Console is priced separately from the rest of SignedBy&apos;s flat-fee plans, because it&apos;s usage that scales
            with an agent or automation rather than a person. No monthly console fee — access comes with any Pro,
            Team, or Business subscription.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong className="text-slate-100">20 document-sends</strong> free every month via console, on any plan — Pro, Team, or Business.</li>
            <li>
              <strong className="text-slate-100">$0.25 per document</strong> sent beyond that, billed monthly alongside your
              subscription — console is metered on every plan, including Business. This is separate from
              Business&apos;s existing unlimited, included access to the plain API (see{" "}
              <Link href="/developers" className="underline hover:text-white">
                /developers
              </Link>
              ), which is unaffected.
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Reads (listing/checking documents) and webhook deliveries are never metered — only creating and sending a
            document counts. Exact pricing is still being finalized; this page will be updated before any charge is
            ever billed.
          </p>
        </div>
      </section>

      <section id="connect" className="mx-auto w-full max-w-3xl scroll-mt-8 border-t border-white/10 px-6 py-10">
        <h2 className="text-xl font-semibold text-slate-100">Connect an AI agent</h2>
        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <p>
            SignedBy runs a real MCP server at{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-slate-200">/api/mcp</code> —
            point Claude, or any other MCP-speaking client, at it directly as a remote connector. Six tools show up
            ready to call: send a document, check status, list documents and templates, void, and download the
            signed PDF. No wrapper code, no manifest to ingest first.
          </p>
          <CodeBlock>{`{
  "mcpServers": {
    "signedby": {
      "url": "https://signedby.ai/api/mcp",
      "headers": { "Authorization": "Bearer sb_live_..." }
    }
  }
}`}</CodeBlock>
          <p className="text-xs text-slate-500">
            Generate the key in Settings → Integration & API — the same key the REST API uses, requires the Pro plan
            or higher.
          </p>
          <p>
            Not using an MCP client? A machine-readable tool manifest for OpenAI-style function calling or a custom
            agent framework also lives at{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-slate-200">/console/tools.json</code>.
          </p>
          <CodeBlock>{`curl https://signedby.ai/console/tools.json`}</CodeBlock>
          <p>
            Under the hood, the MCP server and the manifest both call the same REST endpoints documented in full at{" "}
            <Link href="/developers" className="underline hover:text-white">
              /developers
            </Link>{" "}
            — neither is a different API. Any integration built against the REST API directly works exactly the
            same way.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t border-white/10 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Ready to wire it up?</h2>
        <p className="mt-2 text-slate-400">Sign up free, then upgrade to Pro whenever you&apos;re ready for an API key.</p>
        <CtaLink href={signupHref} className="mt-6" color={ctaColor} page="console" position="footer">
          Start for free →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        {FOOTER_LINKS}
      </footer>
    </main>
  );
}
