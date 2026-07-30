import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

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

  return (
    <main className="flex min-h-screen flex-col bg-slate-950">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          {/* Logo's wordmark is solid black — wrapped in a light chip
              rather than shipping a new asset, since this is the only dark
              header on the site. */}
          <span className="inline-flex rounded-md bg-white px-2 py-1">
            <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-6 w-auto" priority />
          </span>
        </Link>
        <Link href="/login?next=/console/app" className="text-sm font-medium text-slate-300 hover:text-white">
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
            Use your favorite AI to send signing requests.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Signing infra made for Europe. Point an agent, a CRM automation, or your own app at SignedBy&apos;s API and let it
            create, send, and track documents on its own — no separate developer plan, metered only on what you
            actually send.
          </p>
          <CtaLink href="/login?intent=signup&next=/console/app" color={ctaColor} page="console" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-500">
            Requires the Pro plan or higher (templates access). Free to sign up and try the rest of SignedBy first.
          </p>
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
            A machine-readable tool manifest describing every console action lives at{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-slate-200">/console/tools.json</code> —
            point a Claude custom connector, an OpenAI function-calling setup, or your own agent framework at it
            directly.
          </p>
          <CodeBlock>{`curl https://signedby.ai/console/tools.json`}</CodeBlock>
          <p>
            Under the hood these are the same REST endpoints documented in full at{" "}
            <Link href="/developers" className="underline hover:text-white">
              /developers
            </Link>{" "}
            — the manifest is just a thin description of them for an agent to read, not a different API. Any
            integration built against the REST API directly works exactly the same way.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl border-t border-white/10 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Ready to wire it up?</h2>
        <p className="mt-2 text-slate-400">Sign up free, then upgrade to Pro whenever you&apos;re ready for an API key.</p>
        <CtaLink href="/login?intent=signup&next=/console/app" className="mt-6" color={ctaColor} page="console" position="footer">
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
