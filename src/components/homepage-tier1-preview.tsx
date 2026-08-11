import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { FEATURES, TRUSTED_BY, PRICING } from "@/lib/homepage-content";

// Tier 1 from ARACOR_INSPIRED_PRIORITIES.md — a homepage variant to review
// on dev before any decision to promote it, NOT wired into the live
// homepageVariantFlag A/B test (see src/flags.ts). Deliberately its own
// route (src/app/home-preview/page.tsx) rather than a third flag value: the
// flag system exists for measured, tracked traffic splits with real
// methodology, which is premature before Michael has even looked at this.
//
// Two Tier 1 ideas, same capture work per the doc: a looping "hero video"
// (built here as a pure-CSS crossfade of 3 real screenshots already in
// public/ — see globals.css's .animate-hero-crossfade — rather than an
// actual screen recording, since no capture pipeline exists in the
// sandbox), and a screenshot-paired "why SignedBy" section (Aracor's
// 6-reasons pattern, done here as 4 reasons since that's what real,
// honest product screenshots currently support well — see the reasons
// array below for which shots and why).
//
// Copy for the hero (headline/subhead/value props/pricing/trusted-by) is
// deliberately identical to homepage-current.tsx's proven version — this
// is asset/visual work, not a copy test, so nothing about the words
// changes here.

const REASONS: {
  title: string;
  description: string;
  image: string;
  alt: string;
  width: number;
  height: number;
}[] = [
  {
    title: FEATURES[0].title,
    description: FEATURES[0].description,
    image: "/hero-field-editor.png",
    alt: "The SignedBy field editor: a consulting agreement with signature fields placed for two recipients",
    width: 1562,
    height: 1070,
  },
  {
    title: "Signs from any phone",
    description: "No app, no printing — recipients sign with a tap, right in their phone's browser.",
    image: "/hero-signer-mobile.png",
    alt: "A signer signing a document on their phone, with a yellow slide-to-sign bar ready to submit",
    width: 1236,
    height: 2370,
  },
  {
    title: "Every signature is provably real",
    description:
      "Every seal gets an RFC 3161 trusted timestamp from a neutral third party — anyone can verify it independently, no account needed.",
    image: "/hero-verify-result.png",
    alt: "The SignedBy /verify page showing a document confirmed as sealed and identity-verified, with a Sectigo RFC 3161 trusted timestamp",
    width: 900,
    height: 840,
  },
  {
    title: "AI drafts the paperwork",
    description: "Describe the job in plain language and Magic Quote turns it into a signable, itemized quote — free on every plan.",
    image: "/hero-magic-quote.png",
    alt: "The Magic Quote tool generating an itemized price quote from a plain-language job description",
    width: 592,
    height: 972,
  },
];

// Three of the four reasons above double as the hero crossfade — the fourth
// (Magic Quote) is a different product surface entirely (drafting, not
// signing), so it stays in the reasons grid only rather than diluting the
// "watch a document get signed" story the loop is telling.
const HERO_LOOP = [REASONS[0], REASONS[1], REASONS[2]];

export function HomepageTier1Preview({ currency }: { currency: Currency }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Image
          src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
          alt="SignedBy"
          width={266}
          height={64}
          className="h-7 w-auto"
          priority
        />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-16 pb-8 text-center sm:pt-20">
        <Link
          href="/vs/docusign"
          className="mb-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
        >
          <span className="hidden sm:inline">Teams save</span>
          <span className="sm:hidden">Save</span>
          <span className="font-bold text-yellow-300">$700+/year</span>
          <span>vs DocuSign</span>
          <span className="hidden sm:inline">— see the math</span>
          <span aria-hidden>→</span>
        </Link>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">E-signatures</span>, without
          the per-seat tax
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals
          and small teams who sign a handful of documents each month, not a whole sales floor.
        </p>
        <CtaLink
          href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=tier1-preview"
          className="mt-7"
          color="purple"
          page="homepage"
          position="hero"
          variant="tier1-preview"
        >
          Start for free →
        </CtaLink>
        <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      {/* The "hero video" — a looping crossfade of 3 real screenshots in one
          fixed-size card rather than an actual recorded clip (see the file
          comment above and globals.css's .animate-hero-crossfade). A neutral
          bg-slate-50 card with object-contain lets the field-editor
          (landscape), signer-mobile (tall portrait), and verify-result
          (its own baked-in browser chrome) share one frame without any of
          them looking cropped or stretched, despite three different aspect
          ratios. prefers-reduced-motion isn't special-cased: the crossfade
          is a slow opacity fade, not motion/parallax, so it doesn't trigger
          the concerns that setting exists for. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-12">
        <div className="relative mx-auto h-[420px] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          {HERO_LOOP.map((shot, i) => (
            <div
              key={shot.image}
              className="animate-hero-crossfade absolute inset-0 flex items-center justify-center p-6"
              style={{ animationDelay: `${i * -3}s` }}
            >
              <Image
                src={shot.image}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes="(min-width: 640px) 36rem, 92vw"
                className="max-h-full w-auto rounded-lg object-contain shadow-lg"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Real product screens — placing fields, signing, verifying.</p>
      </section>

      {/* Screenshot-paired "why SignedBy" — Aracor's 6-reasons pattern,
          done as 4 here since that's what real screenshots currently
          support without stretching to a mockup. Alternating image side on
          desktop (odd rows flip) so the section doesn't read as a flat
          repeating list; stacks image-above-text on mobile either way. */}
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Why SignedBy</h2>
        <div className="flex flex-col gap-16">
          {REASONS.map((r, i) => (
            <div key={r.title} className={`flex flex-col items-center gap-8 sm:gap-10 ${i % 2 === 1 ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
              <div className="w-full max-w-sm shrink-0 overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
                <Image
                  src={r.image}
                  alt={r.alt}
                  width={r.width}
                  height={r.height}
                  sizes="(min-width: 640px) 24rem, 90vw"
                  className="h-auto w-full"
                />
              </div>
              <div className="max-w-sm text-center sm:text-left">
                <h3 className="text-lg font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-2 text-slate-600">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Trusted by</p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((logo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${logo.name}-${i}`}
                src={logo.src}
                alt={logo.name}
                className={`${logo.height} w-auto shrink-0 opacity-40 grayscale transition-opacity hover:opacity-70`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            EU-based company
          </span>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            GDPR-compliant · EEA data residency
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Simple pricing</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING.map((p) => (
            <Card key={p.name} className="text-center">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPrice(currency, p.id, { withPeriod: true })}
                </p>
                <p className="mt-2 text-xs text-slate-500">{p.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            See full plan details →
          </Link>
        </p>
      </section>
    </>
  );
}
