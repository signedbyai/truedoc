import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import type { CtaColor } from "@/flags";
import { formatPrice, type Currency } from "@/lib/currency";
import { FEATURES, TRUSTED_BY, VALUE_PROPS, PRICING } from "@/lib/homepage-content";

// The "current" side of the homepage-variant test (see src/flags.ts) — the
// live centred single-column hero, unchanged from before that test existed.
// Extracted out of page.tsx verbatim on 2026-07-25 so it could become one of
// two swappable variants; see homepage-two-column.tsx for the other and
// marketing/homepage-layout-test.md for the test write-up.
export function HomepageCurrent({ currency, ctaColor }: { currency: Currency; ctaColor: CtaColor }) {
  return (
    <>
      {/* Widths are deliberately NOT all the same. Unifying them to max-w-6xl
          was a fix for the left-aligned layout, where four different measures
          meant nothing lined up down the left edge. Centred content shares an
          axis whatever its width, so each section can take the measure that
          suits it: a narrow one for reading (hero text), wider for the product
          shot and the feature grid. */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      {/* Asymmetric padding: keeps the generous space above the hero, but
          tightens the gap below the value row so the trusted-by strip sits
          closer to it instead of falling off the first screen. */}
      {/* Centred single column. The two-column left-aligned version (v19/v20)
          got the product shot above the fold, but its collapse was the problem:
          at half-screen widths the layout sat between two states and looked
          unresolved, and centring the text inside a left column is not an
          option — centred text beside a left-edged image never reads as
          deliberate. So one column, centred at every width, with the shot below.

          What v19 changed and this keeps: highlighter on "per-seat tax" in the
          headline rather than a stray phrase at the end of a paragraph, the
          dark savings chip with the number in yellow, the yellow CTA, and the
          value row moved off the first screen so it stops competing with it.
          (v19's one-line subhead did NOT survive — see the note on the
          paragraph below.) */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-16 pb-8 text-center sm:pt-20">
        {/* Concrete-savings badge (V3_Design_Inspiration.md #2, DocTrack-
            style): a number, not an adjective, with /vs/docusign as the
            receipts. "$700+" is the LOW end of the 3-user math already
            published on that page ($75-195/mo DocuSign Standard vs $14/mo
            Team) — keep the two in sync if either page's pricing changes. */}
        {/* A rounded-full pill only reads right on ONE line — wrapped, it
            became a tall slab with big gaps between the fragments on mobile.
            So the copy shortens on small screens rather than the box
            shrinking, and whitespace-nowrap guarantees it can never wrap into a
            slab again. Full sentence returns at sm. */}
        <Link
          href="/vs/docusign"
          className="mb-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
        >
          {/* Two variants rather than one phrase with pieces hidden: mobile
              needs "Save" but not "Teams", and splitting them left desktop
              reading "Teams Save" with a stray capital.

              Mobile previously dropped the whole phrase, so the pill read
              "$700+/year vs DocuSign" — which parses as a price rather than a
              saving, i.e. the opposite of the point. Checked the longer mobile
              copy still fits on one line: ~225px against 272px available even
              at 320px. Worth checking because the pill is nowrap, so getting
              this wrong overflows rather than wraps.

              "/year" stays on mobile even though dropping it would buy room.
              "Save $700+" is ambiguous — per month, per user, ever? The period
              is what makes it a concrete claim, and the claim is the whole
              point of the pill. If a real device disagrees with the maths
              above, drop "vs DocuSign" before dropping "/year". */}
          <span className="hidden sm:inline">Teams save</span>
          <span className="sm:hidden">Save</span>
          <span className="font-bold text-yellow-300">$700+/year</span>
          <span>vs DocuSign</span>
          <span className="hidden sm:inline">— see the math</span>
          <span aria-hidden>→</span>
        </Link>
        {/* Highlighter moved onto "E-signatures" 2026-07-27 (was on
            "per-seat tax" before that, and "Sign documents." before that).
            Leads with what the product is rather than the differentiator —
            SignNow does the same thing with an underline on the front of its
            headline. */}
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          {/* Underline, not a filled block. The fill competed with the CTA
              directly below it — same yellow, similar area, so the one thing we
              want pressed wasn't visibly the loudest. An underline keeps the
              highlighter motif on the word while using a fraction of the ink,
              which leaves the filled yellow rectangle unambiguously the
              button. Matches the nav's active indicator too.
              whitespace-nowrap so "E-signatures" can't break at its own
              hyphen mid-word. */}
          <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">E-signatures</span>, without
          the per-seat tax
        </h1>
        {/* Full explanatory version, restored 2026-07-19 after being cut to
            one line. The one-liner was modelled on Lemonade's six-word
            subhead, but that comparison ignored brand awareness: Lemonade is
            already known in that market, so its page has nothing to explain.
            An unknown beta does. Until people arrive knowing what SignedBy is,
            saying who it's for earns its length — brevity is a luxury of
            recognition. Revisit once the brand carries itself.

            "not a whole sales floor" stays the last clause deliberately: it is
            the sharp, memorable half, and it lands better at the end than
            buried mid-sentence. */}
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals
          and small teams who sign a handful of documents each month, not a whole sales floor.
        </p>
        {/* Yellow, not slate-900. Above the fold yellow was previously doing
              three jobs (pill, highlight, four value icons) while the one thing
              we want pressed was the least coloured element on screen. The
              value icons move below the fold, so up here yellow means exactly
              one thing: press this. */}
        {/* utm_* added 2026-08-01 (see [[signup-attribution]]) — previously
            untagged, and utm_content distinguishes this from
            homepage-two-column.tsx's "v20" variant so the running
            homepage-layout-ab-test can compare actual signup attribution,
            not just cta_click CTR. */}
        <CtaLink
          href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=current"
          className="mt-7"
          color={ctaColor}
          page="homepage"
          position="hero"
          variant="current"
        >
          Start for free →
        </CtaLink>
        <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      {/* Product shot. Until now the marketing site had no image of the actual
          product anywhere — a visitor had to take on faith that it exists and
          looks decent. Deliberately a real screenshot rather than an
          illustration: it doubles as proof, and it's inherently unique to us
          (stock art reads as templated). Wider than the max-w-3xl text column
          so the UI is legible. next/image handles format negotiation and
          reserves the space via width/height, so it can't shift the layout. */}
      {/* Both halves of the product in one image: the sender placing fields on
          desktop, and the signer finishing on a phone. Capped at 40rem and
          centred so it never balloons on a wide monitor — a product shot blown
          up full-width reads as filler rather than proof. The cap came down
          from 46rem, and the phone went up to 28/30%, to shift weight onto the
          signer's phone: most traffic signs on mobile, so that frame is the
          one carrying the pitch even for desktop visitors.

          The phone is absolutely positioned so it overlaps the editor's
          bottom-right (which is mostly whitespace, so nothing meaningful is
          covered) and hangs slightly past the edge for depth. Extra right
          padding on the section reserves room for that overhang.

          On mobile the editor shot is pulled in to 78% and left-aligned so the
          phone has somewhere to sit. It was previously hidden below sm, which
          was backwards: at phone width the editor screenshot is too small to
          read anyway and works only as texture, while the phone shot is the
          one a visitor on a phone can actually parse — and it's the frame that
          answers "what will this be like for the person I send it to". So the
          bigger of the two on mobile is the phone, proportionally. */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-12 sm:pr-12">
        <div className="relative mx-auto max-w-[40rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <Image
              src="/hero-field-editor.png"
              alt="The SignedBy field editor: a consulting agreement with signature fields placed for two recipients, showing the draft auto-saved and ready to send"
              width={1562}
              height={1070}
              priority
              sizes="(min-width: 768px) 40rem, 82vw"
              className="h-auto w-full"
            />
          </div>
          {/* 30% is the ceiling on mobile, not a look-right guess. The phone is
              far taller per unit width (2370/1236) than the editor is (1070/1562),
              and it's anchored to the container's bottom, so past ~32% its top
              edge climbs out of the container and collides with the CTA above.
              30% keeps it inside at every mobile width down to 320px.

              No overhang on mobile (right-0, vs the negative insets from sm up).
              At phone width the container is only a few hundred px, so even a
              4px overhang parked the phone in the right gutter with barely any
              overlap -- it read as a second, unrelated image floating off the
              edge rather than as one composition. */}
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
        {/* EU trust badges (EU_TRUST_CERTIFICATIONS_SCOPE.md) — both claims
            are already true and documented on /security and /dpa (EEA-based
            processing, SPRK10 B.V. as the Dutch legal entity), so this is
            just surfacing existing facts, not a new commitment. Deliberately
            plain bordered pills, not the bold dark CTA-adjacent pill style
            above, since these are supporting proof, not a competing action. */}
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
