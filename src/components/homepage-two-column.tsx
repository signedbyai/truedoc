import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import type { CtaColor } from "@/flags";
import { formatPrice, type Currency } from "@/lib/currency";
import { FEATURES, TRUSTED_BY, VALUE_PROPS, PRICING } from "@/lib/homepage-content";

// The "v20" side of the homepage-variant test (see src/flags.ts) — the
// left-aligned two-column hero that had been kept on the dev branch as a
// preview only, never live on production. Restores v19's product-shot-
// above-the-fold layout (matching Robinhood/Lemonade/SignNow's first
// screen) with v20's corrections: one alignment at every width (was
// centred→left at lg, which gave the page two identities depending on
// window size), a real per-element rhythm instead of a uniform gap, and
// items-start so the short text column doesn't float mid-height against the
// taller screenshot. Extracted out of the dev-only page.tsx verbatim on
// 2026-07-25 so it could become one of two swappable variants; see
// homepage-current.tsx for the other and marketing/homepage-layout-test.md
// for the test write-up.
export function HomepageTwoColumn({ currency, ctaColor }: { currency: Currency; ctaColor: CtaColor }) {
  return (
    <>
      {/* Header widened to max-w-6xl to match the hero section below, so the
          left edge lines up top to bottom — the exact thing v20 was built to
          fix (the live "current" variant's header is max-w-5xl instead, since
          its hero is a narrower centred column that doesn't need the extra
          width). */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-10 px-6 pt-16 pb-8 lg:grid-cols-2 lg:gap-12 lg:pt-24">
        <div className="flex flex-col items-start text-left">
          {/* Concrete-savings badge (V3_Design_Inspiration.md #2, DocTrack-
              style): a number, not an adjective, with /vs/docusign as the
              receipts. "$700+" is the LOW end of the 3-user math already
              published on that page ($75-195/mo DocuSign Standard vs $14/mo
              Team) — keep the two in sync if either page's pricing changes. */}
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
            {/* Underline moved onto "E-signatures" 2026-07-27, matching
                homepage-current.tsx (was on "per-seat tax"). */}
            <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">E-signatures</span>, without
            the per-seat tax
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals
            and small teams who sign a handful of documents each month, not a whole sales floor.
          </p>
          <CtaLink
            href="/login?intent=signup"
            className="mt-7"
            color={ctaColor}
            page="homepage"
            position="hero"
            variant="v20"
          >
            Start for free →
          </CtaLink>
          <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
        </div>

        {/* Product shot, beside the copy instead of below it so it's above
            the fold. Same image treatment as the centred "current" variant. */}
        <div className="relative mx-auto max-w-[40rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <Image
              src="/hero-field-editor.png"
              alt="The SignedBy field editor: a consulting agreement with signature fields placed for two recipients, showing the draft auto-saved and ready to send"
              width={1562}
              height={1070}
              priority
              sizes="(min-width: 1024px) 32rem, (min-width: 768px) 40rem, 82vw"
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

      {/* Value row moved off the first screen. It sat directly under the
          CTA competing with it — four yellow tiles pulling the eye away
          from the one thing we want pressed. Same content, now a strip
          below the hero where it supports rather than competes. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-4">
        {/* Four across at every width. A 2x2 grid on phones read as an odd
            floating square with too much dead space, so the icons/labels/gaps
            just scale down instead — one compact strip on mobile, full size
            from sm up. */}
        <div className="mt-2 grid w-full max-w-xl grid-cols-4 gap-2 border-y border-slate-100 py-4 sm:gap-4 sm:py-5">
          {VALUE_PROPS.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900 sm:h-8 sm:w-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  aria-hidden
                >
                  <path d={v.path} />
                </svg>
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-700 sm:text-xs">{v.label}</span>
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
        {/* EU trust badges — see the matching note in homepage-current.tsx;
            kept identical across both A/B variants. */}
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
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
