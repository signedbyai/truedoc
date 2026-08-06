import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { FlagValues } from "flags/react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

// Companion page to /verified-badge and /verified-badge-invoices
// (2026-08-06, direct ask, after Berkshire Hathaway HomeServices showed up
// in ad audience activity — see marketing/prospects-and-partners.md). Same
// product, same signup flow, a third fear: /verified-badge is "prove a
// client's AI detector is wrong about my work," /verified-badge-invoices is
// "prove a scammer didn't fake my invoice," this page is "prove a scammer
// didn't fake my wire instructions or closing documents." Deliberately NOT
// framed as an "AI can fake this" angle like the invoices page — the
// well-documented real-estate fraud pattern (FBI IC3's own repeated
// warnings) is business-email-compromise/wire fraud: a scammer intercepts a
// closing email thread and sends fake wire instructions, not necessarily an
// AI-generated document. Leading with the real, sourced threat instead of
// reskinning the invoice page's AI framing onto a pattern that predates AI.
//
// Same two honesty rules as every other Verified Badge page, non-negotiable:
// never claim this "stops fraud" or guarantees a scam can't happen — it
// proves a specific file existed, unaltered, as of a verified timestamp,
// sealed by an identity-verified person; and don't overstate the threat
// (no fabricated incident or dollar figure — "costs real money" and "a
// well-documented pattern," not a specific claimed statistic).
const TITLE = "Verified Badge — prove your closing documents are genuinely from you, not a scam | SignedBy";
const DESCRIPTION =
  "Seal your wire instructions and closing documents as unaltered and identity-verified before you send them. Your client scans a code and knows instantly it's really from you. Free to start, no card required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verified-badge-real-estate" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/verified-badge-real-estate" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Same dashboard-native flow as /verified-badge and /verified-badge-invoices
// — utm_campaign changed so this page's own signups are attributable
// separately, same reasoning as [[signup-attribution]].
const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge&utm_medium=cta&utm_campaign=verified_badge_real_estate_page";

// Mostly the same FAQ as the other two Verified Badge pages — only the
// first question is reframed for wire fraud specifically; the rest (client
// view, identity-check freshness, PDF-only, plan/pricing, TSA proof) are the
// same real facts regardless of which fear brought someone here.
const FAQ = [
  {
    q: "Does this stop wire fraud?",
    a: "No — and it doesn't claim to. A Verified Badge proves your real wire instructions or closing document existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified person. That gives your client an actual way to check before they wire money, instead of just trusting that an email looks right — it isn't a guarantee nothing bad can ever happen.",
  },
  {
    q: "What does the client actually see?",
    a: "A badge on your document — a QR code, the SignedBy mark, and a short verification link as plain text, so it reads as legitimate even printed or screenshotted. Scanning or visiting it lands on a public ledger page: your name, when the file was sealed, and confirmation it hasn't been altered since. No account or login needed to check it.",
  },
  {
    q: "What if my identity check is old?",
    a: "Your first seal verifies your identity via a government-ID check (about a minute, hosted by Stripe). Later seals reuse that same verified check rather than re-scanning your ID every time — cheaper and faster. The ledger page always shows \"identity verified on [date]\" alongside \"sealed on [date]\" as two separate facts, so it's clear if the identity check itself is from earlier than this specific seal.",
  },
  {
    q: "Does this work for non-PDF files?",
    a: "PDFs only for now. If your closing documents or wire instructions come from another system as something else, export or print them to a PDF first, then seal that.",
  },
  {
    q: "What plan do I need?",
    a: "Any plan, including Free, no card required. Free includes 3 Verified Badge seals a month. Pro plan or higher gets unlimited sealing, no per-seal charge. Seal a file right from your dashboard's New Document menu — developers can also do this from Console chat or the API, see the developer docs.",
  },
  {
    q: "What actually makes the timestamp \"cryptographically verified\"?",
    a: "Every seal is submitted to a real Time Stamping Authority (Sectigo's public RFC 3161 service, with FreeTSA as an automatic fallback if Sectigo can't be reached) that signs the file's hash together with the time. That's independently verifiable by anyone, trusting only the TSA — not just a date in SignedBy's own database. The ledger page at signedby.ai/verify shows which TSA backed a given seal.",
  },
];

export default async function VerifiedBadgeRealEstatePage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge for Real Estate</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Wire fraud costs real-estate buyers real money. Prove your closing documents are genuinely from you.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          A scammer who intercepts a closing email thread can send fake wire instructions that look completely
          legitimate — costing a buyer their down payment. Seal your real documents first: a hash and
          identity-verified proof your client can check before they wire anything.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
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
          <CtaLink href={START_HREF} color={ctaColor} page="verified-badge-real-estate" position="hero">
            Generate Your Proof →
          </CtaLink>
          <p className="text-xs text-slate-400">Free to start, no card required — takes about a minute to set up.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          <Image
            src="/hero-verified-badge-real-estate.png"
            alt="A Verified Badge stamped in the corner of a real-estate closing statement — the SignedBy mark, a scannable QR code, and a verification link"
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
              step: "2. Seal the document",
              body: "Upload your finished wire instructions or closing document PDF from your dashboard — SignedBy hashes it, timestamps it, and generates your badge.",
            },
            {
              step: "3. Embed the badge",
              body: "Drop the badge on the document before you send it. A client scans it and lands on a public ledger page — no account needed.",
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
          A Verified Badge is a provenance and integrity proof, not a fraud-detection tool. It confirms this exact
          file existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified
          person — a real, useful, different claim from &ldquo;this looks legitimate.&rdquo; Honest framing, on
          purpose: overclaiming here would undercut the one thing that actually holds up under scrutiny.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Generate Your Proof</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free to start — 3 seals a month included, no card required. Need more? Pro plan or higher gets unlimited
          sealing, no per-seal charge.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="verified-badge-real-estate" position="footer">
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
