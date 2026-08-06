import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";

// Audience landing page for independent dealers, brokers, and private
// sellers (2026-08-06, direct ask, after the real-estate/auto-industry
// exploration). Deliberately NOT a Verified Badge / fraud-angle page like
// /verified-badge-real-estate -- the auto research turned up a much
// better-grounded angle than fraud: speed. Cox Automotive's 2025/2026 Car
// Buyer Journey Study found the most satisfied buyers aren't spending less
// time shopping, they're spending less time stuck in the dealership
// process, with speed cited as a key driver of a better-than-expected
// visit. This page pitches the core signing product (fast, from-your-phone
// signing), not fraud prevention.
//
// Deliberately scoped to the *periphery* of the auto market, not
// franchise-dealer finance-office paperwork: that core (F&I) is already
// locked up by DMS-integrated, compliance-specific incumbents (Dealertrack,
// RouteOne) built around state lending/DMV requirements -- not a market a
// generic e-sign tool can casually enter. Independent dealers, brokers, and
// private sellers aren't locked into that stack and are the actual
// addressable audience here, same shape as [[board-resolutions]] and
// [[free-template-landing-pages]] targeting the segment outside an
// entrenched platform's reach rather than competing head-on with it.
const TITLE = "Car Sale & Lease Paperwork — Sign in Minutes | SignedBy";
const DESCRIPTION =
  "Send a bill of sale, purchase agreement, or lease paperwork and get it signed in minutes — from your phone, not stuck at a desk. Free to start, no credit card.";

const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/auto-sales" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/auto-sales", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const SIGNUP_HREF = "/login?intent=signup&utm_source=auto_sales&utm_medium=cta&utm_campaign=auto_sales_page";

const WHY = [
  {
    title: "Not a dealership finance system",
    body: "Franchise dealership finance offices run on DMS-integrated platforms like Dealertrack or RouteOne, built for state lending compliance and priced accordingly. If you're an independent dealer, a broker, or selling privately, you don't need that stack — just a document that gets signed fast.",
  },
  {
    title: "Your buyer signs from their phone",
    body: "No printer, no scanner, no coming back tomorrow. Send the bill of sale or purchase agreement, your buyer opens it on their phone wherever they are, signs, done.",
  },
  {
    title: "Same legal weight, none of the wait",
    body: "An e-signed bill of sale or purchase agreement carries the same legal weight as a wet-ink one under the U.S. ESIGN Act and UETA (and eIDAS in the EU) — signing fast doesn't make it less binding.",
  },
];

const WHAT_YOU_CAN_SEND = ["Bill of sale", "Purchase agreement", "Lease paperwork", "Trade-in form", "Odometer disclosure"];

const FAQ = [
  {
    q: "Is an e-signed bill of sale legally valid?",
    a: "Yes. E-signatures carry the same legal weight as a wet-ink signature under the U.S. ESIGN Act and UETA, and the EU's eIDAS regulation. Most states don't require a bill of sale to be notarized — check your own state's title-transfer requirements, since a few do.",
  },
  {
    q: "Does this replace my dealership's finance or DMS system?",
    a: "No. If you're a franchise dealer running financing through Dealertrack, RouteOne, or a similar DMS-integrated platform, that's a different, compliance-specific stack SignedBy isn't trying to replace. This is for the paperwork outside that — an independent dealer's bill of sale, a broker's purchase agreement, a private seller's paperwork.",
  },
  {
    q: "What documents can I send?",
    a: "Any PDF — a bill of sale, purchase agreement, lease paperwork, trade-in form, odometer disclosure statement. Upload it, add signature fields, send.",
  },
  {
    q: "What plan do I need?",
    a: "Free includes 3 documents a month, no credit card required. Pro plan or higher gets unlimited sends.",
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

export default async function AutoSalesPage() {
  const ctaColor = await ctaColorFlag();

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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">For independent dealers, brokers &amp; private sellers</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Car paperwork, signed. Not stuck at a desk.</h1>
        <p className="max-w-xl text-base text-slate-600">
          Buyers rate a faster visit as a better one, and paperwork is where most of that time goes. Send your bill of
          sale, purchase agreement, or lease paperwork from your phone — your buyer signs from theirs, in minutes.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={SIGNUP_HREF} color={ctaColor} page="auto-sales" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
        </div>
        <LanguageSupportRow />
      </section>

      {/* Same two-layer composition as the homepage hero
          (homepage-current.tsx): a large background panel with
          hero-signer-mobile.png overlapping its bottom-right corner,
          reusing that section's own proven responsive positioning
          (30% width ceiling on mobile, overhang from sm up) rather than
          inventing new layout math. Background is a document mockup
          (hero-auto-sales.png, generate-hero-auto-sales-v2.tsx) -- a
          "Vehicle Purchase Agreement" shown in an app-chrome frame,
          same real-product-screenshot language as the rest of the site
          rather than clipart/illustration. Swapped 2026-08-07 after
          direct feedback that a flat car+key icon graphic looked bad;
          the signature field is placed bottom-left specifically so the
          phone overlay in the corner doesn't cover it. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-10 sm:pr-12">
        <div className="relative mx-auto max-w-[32rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <Image
              src="/hero-auto-sales.png"
              alt="A vehicle purchase agreement document with a price breakdown and a buyer signature field, representing the paperwork you can send"
              width={1562}
              height={1070}
              priority
              sizes="(min-width: 768px) 32rem, 82vw"
              className="h-auto w-full"
            />
          </div>
          <div className="absolute -bottom-6 right-0 w-[30%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:-right-6 sm:w-[28%] lg:-right-10 lg:w-[30%]">
            <Image
              src="/hero-signer-mobile.png"
              alt="A signer signing the same document on their phone: a handwritten signature drawn in the signature pad, with a yellow slide-to-sign bar ready to submit"
              width={1236}
              height={2370}
              sizes="(min-width: 1024px) 12rem, (min-width: 640px) 11rem, 30vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-10">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {WHY.map((item) => (
            <div key={item.title} className="px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-1.5 text-sm text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-10">
        <h2 className="text-lg font-semibold text-slate-900">What you can send</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {WHAT_YOU_CAN_SEND.map((doc) => (
            <span key={doc} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              {doc}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-12">
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

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="auto-sales" position="footer">
          Start for free →
        </CtaLink>
        <div className="mt-5">
          <LanguageSupportRow />
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/templates" className="hover:text-slate-600">
            Free templates
          </Link>
          <Link href="/vs/docusign" className="hover:text-slate-600">
            SignedBy vs DocuSign
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            API docs
          </Link>
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
