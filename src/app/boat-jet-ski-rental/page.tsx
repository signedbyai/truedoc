import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";
import { findTemplatePage } from "@/lib/template-pages";

// Audience landing page, added 2026-08-07 — same pattern as
// board-resolutions/page.tsx (template-driven, no hero image asset), built
// right after adding the watercraft_rental template/AI-drafter type: a real
// Sicilian boat rental contract adapted into a demo, direct ask to turn
// that into a proper CTA page for the vertical. Unlike board-resolutions
// (two sibling templates), there's only one template here, so the "start
// from a real template" section below is a single full-width card, not a
// grid.

const TITLE = "Boat & Jet Ski Rental Agreements — Signed Before They Leave the Dock | SignedBy";
const DESCRIPTION =
  "Get boat and jet ski rental agreements signed in minutes — condition at handover, ID capture, damage liability, and a late-return fee all built in. Free template included, from $7/mo.";

// This route has no colocated opengraph-image.tsx of its own, same as
// board-resolutions and /vs/* — has to explicitly point back at the root
// layout's shared one, or it silently gets no preview image at all.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/boat-jet-ski-rental" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/boat-jet-ski-rental", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

// Pulled by slug rather than duplicated here, so this page and /templates
// stay in sync automatically if that content ever moves — same reasoning
// as board-resolutions' RESOLUTION_TEMPLATE_SLUGS.
const rentalTemplate = findTemplatePage("boat-jet-ski-rental-agreement-template");

// utm_* pattern matches signup-attribution.md's convention.
const SIGNUP_HREF =
  "/login?intent=signup&utm_source=boat_jet_ski_rental&utm_medium=cta&utm_campaign=boat_jet_ski_rental_page";

const WHY = [
  {
    title: "A real rental agreement, not a blank page",
    body: "Built from a real marine rental contract, not a generic template — condition at handover, damage and fine liability, and a late-return fee are already in there. You're customizing it, not writing it from scratch.",
  },
  {
    title: "Signed on the dock, not back at the office",
    body: "Send the link from a phone and they sign before they untie the line. No printer, no scanner, and no chasing a signature after the fact when the only record you have is a memory of a conversation.",
  },
  {
    title: "Renter details captured in the same document",
    body: "The agreement's own identification section — name, ID document, address, phone — is filled in and signed together with the rest of the contract, so there's no separate paper form sitting in a drawer at the counter.",
  },
];

const FAQ = [
  {
    q: "Do I need a separate liability waiver in addition to the rental agreement?",
    a: "Not necessarily — the rental agreement already includes the renter's assumption of risk and an injury-liability disclaimer. A separate waiver makes more sense if you also run guided activities (e.g. an instructor-led jet ski tour), where the risk profile is different from an unsupervised rental.",
  },
  {
    q: "Can I require ID before handing over the keys?",
    a: "Yes — the template includes a dedicated identification section (name, ID document, address, phone) that's part of the same signed document, rather than a separate paper form you manage at the counter.",
  },
  {
    q: "What happens if the boat or jet ski comes back late?",
    a: "The template includes a late-return fee you set yourself — the real-world contract this was built from used a flat €50 — spelled out up front instead of negotiated in the moment.",
  },
  {
    q: "What plan do I need?",
    a: "Sending this agreement to a renter works on every plan, including Free (3 documents a month). Saving it as a reusable template you fill in for every rental — so you're not rebuilding it each time — is included starting on the Pro plan ($7/mo).",
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

export default async function BoatJetSkiRentalPage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">For boat & jet ski rental operators</p>
        {/* Direct ask, mid-session, 2026-08-07: "Stop loosing weekend revenue
            to paperwork" / "Lines at the dock cost you money" / "Digitize
            your boat and jet ski rental waivers." Kept "rental agreement"
            over "waivers" in the actual copy -- this page's own FAQ below
            draws a real distinction between the two (a waiver alone doesn't
            cover damage/fine/late-return liability), so using "waiver" in
            the hero would contradict the page's own answer. */}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Stop losing weekend revenue to paperwork.</h1>
        <p className="max-w-xl text-base text-slate-600">
          Lines at the dock cost you money. Digitize your boat and jet ski rental agreement — capture their ID and get
          it signed on a phone before they leave the counter, not after a jet ski comes back with a cracked hull.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={SIGNUP_HREF} color={ctaColor} page="boat-jet-ski-rental" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
        </div>
        <LanguageSupportRow />
      </section>

      {/* Same two-layer composition as auto-sales/page.tsx and the homepage
          hero (homepage-current.tsx): a document mockup as the background
          panel, hero-signer-mobile.png overlapping its bottom-right corner,
          reusing that section's proven responsive positioning rather than
          inventing new layout math. Direct ask, 2026-08-07: "show a hero
          image for this one, with the Rental Agreement and the home page
          mobile signing image" -- so the mobile shot is the *same* file the
          homepage uses, unchanged, and only the background document mockup
          is new (hero-boat-jet-ski-rental.png, generated by
          scripts/generate-hero-boat-jet-ski-rental.tsx). The mockup's own
          "$50.00 late-return fee" line is a deliberate callback to this
          page's FAQ answer about it. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-10 sm:pr-12">
        <div className="relative mx-auto max-w-[32rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <Image
              src="/hero-boat-jet-ski-rental.png"
              alt="A boat and jet ski rental agreement showing the vessel, a rental price breakdown including a late-return fee, and a renter signature field"
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

      {rentalTemplate && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-10">
          <h2 className="text-lg font-semibold text-slate-900">Start from a real template</h2>
          <Link
            href={`/templates/${rentalTemplate.slug}`}
            className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
          >
            <h3 className="text-base font-semibold text-slate-900">{rentalTemplate.h1}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{rentalTemplate.intro[0]}</p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
              View template →
            </span>
          </Link>
        </section>
      )}

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
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="boat-jet-ski-rental" position="footer">
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
          {/* Setup/signing walkthrough, added 2026-08-08 (direct ask) --
              first in the row since it's the most relevant next click for
              this page's own audience, ahead of the generic site-wide
              links. */}
          <Link href="/boat-jet-ski-rental/guide" className="hover:text-slate-600">
            Setup & signing guide
          </Link>
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
