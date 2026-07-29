import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import { FlagValues } from "flags/react";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";

// Entry-point test for the Australian trades market, 2026-07-27 — see
// /magic-quote/us-subcontractors for the US-side sibling. Both reuse the
// same live Magic Quote feature and copy the parent page's structure
// closely; only the framing, example prompt, and FAQ are localized. No new
// product behavior here — AUD isn't one of SignedBy's 4 billing currencies
// (currency.ts: USD/EUR/GBP/CHF only), but that only affects a paid-plan
// upgrade. Magic Quote itself is free and currency-agnostic: the "$"
// picker has no country code attached, so an AU tradie's quote reads
// exactly like one they'd write by hand.
const TITLE = "Quote Software for Tradies — Describe the Job, Get a Quote (AU) | SignedBy";
const DESCRIPTION =
  "Free AI quoting for Australian tradies. Describe the job in plain English, get an editable line-item quote with GST, and send it for a legally binding e-signature — no job-management subscription required.";

// This route's own colocated opengraph-image.tsx generates a localized
// card ("Say the job. Get a proper quote — GST and all.") — added
// 2026-07-27, previously fell back to the parent /magic-quote card. Same
// explicit-images-array pattern /vs/* uses, since a page that sets its own
// openGraph/twitter metadata stops Next auto-inheriting anything.
const OG_IMAGE = ["/magic-quote/au-tradies/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/magic-quote/au-tradies" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://signedby.ai/magic-quote/au-tradies",
    images: OG_IMAGE,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: OG_IMAGE },
};

const START_HREF = "/login?intent=signup&next=" + encodeURIComponent("/dashboard/documents/new?mode=quote");

const FAQ = [
  {
    q: "Does this replace ServiceM8, Tradify, or Fergus?",
    a: "Not for job management — those handle scheduling, invoicing, and job costing for an ongoing business, and charge a monthly fee for it. Magic Quote does one job: turn a plain-language description into a proper, editable, signable quote, for free. Plenty of tradies use it as a fast on-site quoting step alongside whatever else they already run.",
  },
  {
    q: "Does it handle GST?",
    a: "Yes — set your own tax rate (10% for GST, or whatever applies to the job) and it's calculated and shown on the quote. SignedBy's own code does the maths, not the AI, so the total on the PDF is always exactly right and recalculates instantly if you change a price or quantity.",
  },
  {
    q: "Is an e-signed quote actually legally binding in Australia?",
    a: "Yes — electronic signatures are recognised under Australia's Electronic Transactions Act 1999 (and the equivalent state and territory legislation), on similar legal footing to the U.S. ESIGN Act. SignedBy records a timestamped, IP-logged audit trail with every signature. This is general information, not legal advice for your specific situation.",
  },
  {
    q: "What plan do I need?",
    a: "None — Magic Quote is free on every plan, including Free. Sending the finished quote for signature follows the same document limits as any other SignedBy document (3/month on Free, unlimited on Starter+).",
  },
  {
    q: "What currency does it use?",
    a: "Pick “$” and enter your prices in AUD — the quote itself has no currency code attached, so it reads exactly like any quote you'd write by hand. (If you upgrade to a paid plan later for extra features, that's currently billed in USD — Magic Quote is free either way.)",
  },
  {
    q: "What languages does it support?",
    a: "English, Spanish, French, German, Portuguese, Dutch, and Italian — useful if you're quoting a job for a customer, or working with a crew, whose first language isn't English.",
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

export default async function MagicQuoteAuTradiesPage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Magic Quote for Australian tradies</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Say the job. Get a proper quote — GST and all. Fast.{" "}
          <Zap className="inline-block h-6 w-6 -translate-y-0.5 fill-yellow-300 text-yellow-300 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Skip the job-management subscription. Describe the job in plain English and Magic Quote pulls out the line
          items and prices you mentioned, then hands you an editable, GST-ready quote — sendable for a real
          e-signature in the same document.
        </p>
        <p className="max-w-xl text-sm text-slate-500">
          {"e.g. "}
          <span className="italic">
            &ldquo;Hot water system replacement for the Nguyen job — $450 for the unit, 3 hours labour at $95 an
            hour, plus GST&rdquo;
          </span>
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={START_HREF} color={ctaColor} page="magic-quote-au-tradies" position="hero">
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
              body: "A sentence or two — what you're quoting, quantities, and the prices you already have in mind.",
            },
            {
              step: "2. Review the line items",
              body: "Edit descriptions, quantities, prices, and tax rate — punch in 10% for GST, or whatever applies. Totals recompute live from your numbers, not the AI's.",
            },
            {
              step: "3. Send for signature",
              body: "Confirm and it becomes a normal SignedBy document — fields, audit trail, legally recognised e-signature, ready to sign.",
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
        <h2 className="text-lg font-semibold text-slate-900">
          You don&apos;t need a full job-management platform just to send one quote
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          ServiceM8, Tradify, and Fergus are solid tools if you&apos;re running scheduling, invoicing, and job costing
          for a whole crew — and they cost a real monthly subscription for it. If all you need right now is a fast,
          professional quote a customer can actually sign, Magic Quote does that one job well, for free, with no
          setup and no ongoing commitment.
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
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="magic-quote-au-tradies" position="footer">
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
          <Link href="/pricing" className="underline underline-offset-2 hover:text-slate-900">
            Pricing
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
