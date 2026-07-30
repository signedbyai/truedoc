import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import { FlagValues } from "flags/react";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";

// Entry-point test for US building subcontractors, 2026-07-27 — see
// /magic-quote/au-tradies for the Australian-side sibling. Same live Magic
// Quote feature, same page structure as the parent /magic-quote page; only
// the framing, example prompt, and FAQ are localized to this audience
// (bids/change orders, US sales tax, and the bid-management-platform
// category it's deliberately NOT competing with).
const TITLE = "Quote Software for Subcontractors — Describe the Job, Get a Bid | SignedBy";
const DESCRIPTION =
  "Free AI quoting for US building subcontractors. Describe the job or change order, get an editable line-item quote, and send it for a legally binding e-signature — no bid-management platform required.";

// This route's own colocated opengraph-image.tsx generates a localized
// card ("Describe the job. Get a bid-ready quote.") — added 2026-07-27,
// previously fell back to the parent /magic-quote card. Same
// explicit-images-array pattern /vs/* uses, since a page that sets its own
// openGraph/twitter metadata stops Next auto-inheriting anything.
const OG_IMAGE = ["/magic-quote/us-subcontractors/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/magic-quote/us-subcontractors" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://signedby.ai/magic-quote/us-subcontractors",
    images: OG_IMAGE,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: OG_IMAGE },
};

const START_HREF = "/login?intent=signup&next=" + encodeURIComponent("/dashboard/documents/new?mode=quote");

const FAQ = [
  {
    q: "Does this replace BuildingConnected, PlanHub, or SmartBid?",
    a: "Not for formal bid solicitation — those are built for GCs running takeoffs and invitations-to-bid across a large subcontractor network. Magic Quote is for the other side of that relationship: turning a plain-language job or change-order description into a proper, editable, signable quote or bid, for free.",
  },
  {
    q: "Does it handle sales tax?",
    a: "Set your own tax rate — sales tax on labor and materials varies by state (and whether labor is even taxed at all), so Magic Quote doesn't guess for you. Whatever rate you enter, SignedBy's own code — not the AI — computes the tax amount and total, and recalculates instantly if you edit anything.",
  },
  {
    q: "Can I use this for a change order, not just a new bid?",
    a: "Yes — describe the added scope and price the same way, and it becomes its own line-item document ready to sign. Many subs use Magic Quote specifically for the fast-turnaround change orders that come up mid-job, where a full re-bid process doesn't make sense.",
  },
  {
    q: "Is an e-signed quote or change order legally binding?",
    a: "Yes — under the U.S. ESIGN Act and UETA (adopted in nearly every state), an electronic signature carries the same legal weight as a wet-ink one, backed by a timestamped, IP-logged audit trail SignedBy records on every document. This is general information, not legal advice for your specific situation.",
  },
  {
    q: "What plan do I need?",
    a: "None — Magic Quote is free on every plan, including Free. Sending the finished quote for signature follows the same document limits as any other SignedBy document (3/month on Free, unlimited on Pro+).",
  },
  {
    q: "Does it work in Spanish?",
    a: "Yes — English, Spanish, French, German, Portuguese, Dutch, and Italian are all supported. Pick a language on the describe step and everything switches, including the quote PDF itself — useful if your crew, your GC, or your customer's first language isn't English.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default async function MagicQuoteUsSubcontractorsPage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image
            src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
            alt="SignedBy"
            width={266}
            height={64}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Magic Quote for building subcontractors
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Describe the job. Get a bid-ready quote. Fast.{" "}
          <Zap className="inline-block h-6 w-6 -translate-y-0.5 fill-yellow-300 text-yellow-300 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Skip the enterprise bid-management platform. Describe the scope in plain language and Magic Quote pulls
          out the line items and prices you mentioned, then hands you an editable quote or change order — sendable
          for a real e-signature in the same document.
        </p>
        <p className="max-w-xl text-sm text-slate-500">
          {"e.g. "}
          <span className="italic">
            &ldquo;Change order for the Miller job — additional outlet run, $180 materials, 3 hours labor at
            $75/hr&rdquo;
          </span>
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={START_HREF} color={ctaColor} page="magic-quote-us-subcontractors" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">Free on every plan, including Free. No credit card required.</p>
        </div>
        <LanguageSupportRow />
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          <Image
            src="/hero-magic-quote.png"
            alt="Magic Quote review screen showing an AI-generated line-item quote with editable line items and computed totals"
            width={592}
            height={972}
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
              step: "1. Describe the job",
              body: "A sentence or two — the scope you're quoting or the change order, quantities, and the prices you already have in mind.",
            },
            {
              step: "2. Review the line items",
              body: "Edit descriptions, quantities, prices, and tax rate — sales tax rules vary by state, so you're always in control of what goes on the quote. Totals recompute live from your numbers, not the AI's.",
            },
            {
              step: "3. Send for signature",
              body: "Confirm and it becomes a normal SignedBy document — fields, audit trail, ESIGN/UETA compliant, ready for the GC or owner to sign.",
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
        <h2 className="text-lg font-semibold text-slate-900">Not another bid-management platform</h2>
        <p className="mt-3 text-sm text-slate-600">
          BuildingConnected, PlanHub, and SmartBid are built for GCs running formal bid solicitations across a big
          subcontractor network — takeoffs, invitations-to-bid, bid leveling. If what you actually need is to get a
          fast, professional quote or change order in front of a GC or property owner and get it signed, Magic Quote
          does that one job, for free, with no setup and no ongoing commitment.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Math you can trust</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          The AI never calculates a subtotal, tax amount, or total — it only reads the numbers you describe. Every
          total on screen and in the final PDF is computed by SignedBy&apos;s own code, and recalculates instantly if
          you change a quantity, price, or tax rate.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try Magic Quote</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free on every plan, including Free — no credit card, no upgrade required to try it.
        </p>
        <CtaLink
          href={START_HREF}
          className="mt-5"
          color={ctaColor}
          page="magic-quote-us-subcontractors"
          position="footer"
        >
          Start for free →
        </CtaLink>
        <div className="mt-5">
          <LanguageSupportRow />
        </div>
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
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/ai-drafter" className="underline underline-offset-2 hover:text-slate-900">
            AI Drafter
          </Link>{" "}
          ·{" "}
          <Link href="/templates" className="underline underline-offset-2 hover:text-slate-900">
            Free templates
          </Link>{" "}
          ·{" "}
          <Link href="/vs/docusign" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs DocuSign
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
