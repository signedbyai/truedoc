import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { FlagValues } from "flags/react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

// The top-of-funnel play this page is the real destination for (see
// VERIFIED_BADGE_SCOPE.md's "The catch" section): freelancers already are
// SignedBy's stated ICP, and "a client's AI detector falsely flags my human
// work" is a specific, current, high-anxiety scenario — sharper than
// generic "prove your work" copy. Deliberately doesn't name any AI-detector
// product by name (a wedge against a third-party pain point, not a
// head-to-head comparison the way /vs/* pages are).
const TITLE = "Verified Badge — pre-verify your work before a client's AI detector does | SignedBy";
// DESCRIPTION corrected 2026-08-01 (direct instruction, following a console
// sign-up/login audit): this used to say "Console/MCP, Pro plan or higher,"
// contradicting the page's own body copy below (which correctly advertises
// Free tier) — a misleading Google/social preview for exactly the free-tier
// audience this page targets. See CONSOLE_FREE_TIER_SCOPE.md.
const DESCRIPTION =
  "Seal a finished file as unaltered and identity-verified, then embed a scannable proof badge on the deliverable. Anyone can check it, with no account needed. Free to start, no card required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verified-badge" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/verified-badge" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Dashboard-native as of 2026-08-05 (VERIFIED_BADGE_DASHBOARD_SCOPE.md) —
// this CTA used to send people to console.signedby.ai to sign up
// (Console/MCP was the only way to reach sealing at all); now it opens
// straight into the main dashboard's New Document > Verified Badge tab, the
// same ?mode= pattern /magic-quote's own CTA uses (see new-document-
// client.tsx's initialMode). Console/MCP still work (sealDocumentAction is
// shared across all three surfaces), but this page — the actual top-of-
// funnel entry point — now points at the surface most people will actually
// use. Free on every plan, not Pro+-gated. utm_* params added 2026-08-01
// (direct ask, following the console sign-up/login audit: "how many
// visited, clicked, then logged in" turned out to be unanswerable). Reuses
// the existing first-touch attribution pipeline as-is (attribution-
// capture.tsx/attribution-claim.tsx/migration 0024, see
// [[signup-attribution]]) rather than building something new —
// AttributionCapture already stashes any utm_* it finds on ANY page load
// into localStorage (first touch only), so it picks these up the moment
// the browser lands on /login with them in the URL, no changes needed
// there. Source/medium/campaign chosen to read naturally alongside real ad
// UTMs in the same signup_utm_* columns later.
const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge&utm_medium=cta&utm_campaign=verified_badge_page";

// Plain module-level const again as of 2026-08-05 — no answer below needs a
// resolved visitor currency anymore now that sealing has no per-seal
// overage price at all (decision 2, VERIFIED_BADGE_DASHBOARD_SCOPE.md); it
// briefly needed to be a function (2026-08-01) so the "What plan do I need?"
// answer could quote Console's per-seal overage rate in the visitor's own
// currency.
const FAQ = [
    {
      q: "Does this prove my work wasn't written or made with AI?",
      a: "No — and it doesn't claim to. A Verified Badge proves this exact file existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified person. That's a real, different, useful claim from \"an AI detector says this is human,\" which is exactly why AI detectors have a false-positive problem in the first place: they're guessing at authorship, not proving timestamp and integrity.",
    },
    {
      q: "What does the client actually see?",
      a: "A badge on your deliverable — a QR code, the SignedBy mark, and a short verification link as plain text, so it reads as legitimate even printed or screenshotted. Scanning or visiting it lands on a public ledger page: your name, when the file was sealed, and confirmation it hasn't been altered since. No account or login needed to check it.",
    },
    {
      q: "What if my identity check is old?",
      a: "Your first seal verifies your identity via a government-ID check (about a minute, hosted by Stripe). Later seals reuse that same verified check rather than re-scanning your ID every time — cheaper and faster. The ledger page always shows \"identity verified on [date]\" alongside \"sealed on [date]\" as two separate facts, so it's clear if the identity check itself is from earlier than this specific seal.",
    },
    {
      q: "Does this work for non-PDF files?",
      a: "PDFs only for now. If your finished work is a design export, code, or something else, export or print it to a PDF first, then seal that.",
    },
    {
      q: "What plan do I need?",
      a: 'Any plan, including Free, no card required. Free includes 3 Verified Badge seals a month. Pro plan or higher gets unlimited sealing, no per-seal charge. Seal a file right from your dashboard\'s New Document menu — Console chat and the seal_document MCP tool still work too, for anyone wiring in an AI agent, see the developer docs.',
    },
    {
      q: "What actually makes the timestamp \"cryptographically verified\"?",
      a: "Every seal is submitted to a real Time Stamping Authority (Sectigo's public RFC 3161 service, with FreeTSA as an automatic fallback if Sectigo can't be reached) that signs the file's hash together with the time. That's independently verifiable by anyone, trusting only the TSA — not just a date in SignedBy's own database. The ledger page at signedby.ai/verify shows which TSA backed a given seal.",
    },
  ];

export default async function VerifiedBadgePage() {
  const ctaColor = await ctaColorFlag();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Don&apos;t let a flawed AI detector ruin your client relationship.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          A client running your work through an AI detector and getting a false positive is a real, specific fear —
          and one bad guess shouldn&apos;t cost you the relationship. Pre-verify your human effort: seal the finished
          file, get a scannable proof badge, embed it on the deliverable.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          {/* Announcement callout, styled as a popover so it reads as a
              fresh update rather than static page copy — updated 2026-08-05
              (VERIFIED_BADGE_DASHBOARD_SCOPE.md) from the original
              "free console access" announcement (CONSOLE_FREE_TIER_SCOPE.md,
              2026-08-02): sealing is now a dashboard-native New Document tab,
              not something you need Console for at all. Real claim, not a
              promo exaggeration — see new-document-client.tsx's Verified
              Badge tab. */}
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Now built right into your dashboard — seal your first document free today.
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color={ctaColor} page="verified-badge" position="hero">
            Generate Your Proof →
          </CtaLink>
          <p className="text-xs text-slate-400">
            Free to start — 3 seals a month, no card required. Pro plan or higher for unlimited sealing.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          <Image
            src="/hero-verified-badge.png"
            alt="A Verified Badge — the SignedBy mark, a scannable QR code, and a verification link, generated for a sealed document"
            width={640}
            height={820}
            priority
            sizes="(max-width: 640px) 90vw, 384px"
            className="h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Verify once",
              body: "A one-time government-ID check (about a minute, hosted by Stripe). Reused across every future seal — no re-scanning your ID each time.",
            },
            {
              step: "2. Seal the file",
              body: "Upload the finished PDF from your dashboard's New Document menu — Console chat and the seal_document MCP tool work too, if you're already using either. SignedBy hashes it, timestamps it, and generates your badge.",
            },
            {
              step: "3. Embed the badge",
              body: "Drop the badge on your invoice, portfolio, or the deliverable itself. A client scans it and lands on a public ledger page — no account needed.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">What this actually proves</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          A Verified Badge is a provenance and integrity proof, not an AI-detector rebuttal. It confirms this exact
          file existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified
          person — a real, useful, different claim from &ldquo;an algorithm guessed this is human.&rdquo; Honest
          framing, on purpose: overclaiming here would undercut the one thing that actually holds up under scrutiny.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Generate Your Proof</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free to start — 3 seals a month included, no card required. Need more? Pro plan or higher gets unlimited
          sealing, no per-seal charge.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="verified-badge" position="footer">
          Generate Your Proof →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQ.map((item) => (
            <div key={item.q} className="px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="text-sm text-slate-500">
          Also on SignedBy:{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Verify a document
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            API &amp; MCP docs
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/pricing" className="hover:text-slate-600">
            Pricing
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
        </p>
      </footer>
    </main>
  );
}
