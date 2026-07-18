import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ReferralCapture } from "@/components/referral-capture";
import { getRequestCurrency } from "@/lib/currency.server";
import { formatPrice, type PlanKey } from "@/lib/currency";

// Self-canonical so the homepage is the one indexed URL for the brand — title
// and description are inherited from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    title: "Drag-and-drop fields",
    description: "Place signature, initials, date, and text fields directly on the PDF in seconds.",
  },
  {
    title: "Multi-signer routing",
    description: "Sequential or parallel signing order, with automatic reminders until it's done.",
  },
  {
    title: "Audit-ready by default",
    description: "Every action is timestamped, hashed, and IP-logged — ESIGN and UETA compliant out of the box.",
  },
  {
    title: "No per-seat tax",
    description: "Flat, transparent pricing built for solo professionals and small teams, not enterprise procurement.",
  },
];

// All real early customers now — every placeholder logo was removed on
// 2026-07-15 (Ironwood Builders, Hartwell Accounting, Crestline Realty,
// Ashcroft Law Group, and the fake Northbridge Capital). Thinq.AI was removed
// 2026-07-15 too. Only add real clients here from now on.
const TRUSTED_BY = [
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
  { name: "AlphaIndigo", src: "/logos/alphaindigo.png", height: "h-5" },
  { name: "Studio Vider", src: "/logos/studio-vider.png", height: "h-5" },
];

// Static value row — replaced the rotating <HighlightReel> carousel on
// 2026-07-18. A cycling hero carousel is one of the strongest "AI-built site"
// tells (which was exactly the user feedback), only ever showed one phrase at
// a time, and left only the first phrase in the HTML for crawlers/first paint.
// Flat, all four are readable at once and the yellow icon tiles extend the
// same accent as the hero highlight. Single-path stroke icons, inline like the
// other SVGs in this codebase (see login page / status-pill) — no icon
// dependency.
const VALUE_PROPS: { label: string; path: string }[] = [
  { label: "Send faster", path: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { label: "Track progress", path: "M3 12h4l3 8 4-16 3 8h4" },
  { label: "Gate access", path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { label: "Close deals", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12l2 2 4-4" },
];

const PRICING: { name: string; id: PlanKey; blurb: string }[] = [
  { name: "Free", id: "free", blurb: "3 documents/mo, 1 user" },
  { name: "Starter", id: "starter", blurb: "Unlimited documents, 1 user" },
  { name: "Team", id: "team", blurb: "Up to 3 users, custom branding" },
  { name: "Business", id: "business", blurb: "Up to 5 users, API access" },
];

export default async function LandingPage() {
  // EUR for Eurozone visitors, USD for the rest (from geo/cookie) — same
  // resolution the /pricing page and checkout use, so the figures stay in
  // sync across the whole funnel. See src/lib/currency.ts.
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      {/* Asymmetric padding: keeps the generous space above the hero, but
          tightens the gap below the value row so the trusted-by strip sits
          closer to it instead of falling off the first screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pt-20 pb-8 text-center">
        {/* Concrete-savings badge (V3_Design_Inspiration.md #2, DocTrack-
            style): a number, not an adjective, with /vs/docusign as the
            receipts. "$700+" is the LOW end of the 3-user math already
            published on that page ($75-195/mo DocuSign Standard vs $14/mo
            Team) — keep the two in sync if either page's pricing changes. */}
        {/* A rounded-full pill only reads right on ONE line — wrapped, it
            became a tall slab with big gaps between the fragments on mobile.
            So the copy shortens on small screens ("$700+/year vs DocuSign →")
            rather than the box shrinking, and whitespace-nowrap guarantees it
            can never wrap into a slab again. Full sentence returns at sm. */}
        <Link
          href="/vs/docusign"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-yellow-100 sm:px-4 sm:py-1.5 sm:text-sm"
        >
          <span className="hidden sm:inline">Teams save</span>
          <span className="font-bold">$700+/year</span>
          <span>vs DocuSign</span>
          <span className="hidden sm:inline">— see the math</span>
          <span aria-hidden>→</span>
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          E-signatures, without the per-seat tax.
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals and
          small teams who sign a handful of documents a month, not a whole sales floor.{" "}
          <span className="inline-block -rotate-1 rounded bg-yellow-300 px-1.5 py-0.5 font-semibold text-slate-900">
            Sign documents.
          </span>
        </p>
        <Link href="/login?intent=signup" className={buttonVariants({ size: "lg" })}>
          Send your first document free →
        </Link>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>

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

      {/* Product shot. Until now the marketing site had no image of the actual
          product anywhere — a visitor had to take on faith that it exists and
          looks decent. Deliberately a real screenshot rather than an
          illustration: it doubles as proof, and it's inherently unique to us
          (stock art reads as templated). Wider than the max-w-3xl text column
          so the UI is legible. next/image handles format negotiation and
          reserves the space via width/height, so it can't shift the layout. */}
      {/* Sized down deliberately: capped at 46rem (~736px) and centred, so it
          never balloons on a wide monitor — a product shot blown up to full
          width reads as filler rather than proof. The wrapper is a flex row
          ready for the planned second shot (mobile signer view) to sit
          alongside on the right; adding it means dropping a second child in
          and giving this one a width class. */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-12">
        <div className="mx-auto flex max-w-[46rem] justify-center">
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <Image
              src="/hero-field-editor.png"
              alt="The SignedBy field editor: a consulting agreement with signature fields placed for two recipients, showing the draft auto-saved and ready to send"
              width={1557}
              height={1058}
              priority
              sizes="(min-width: 768px) 46rem, 100vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          Trusted by
        </p>
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

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/signnow" className="hover:text-slate-600">
            vs SignNow
          </Link>
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Security
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Verify a document
          </Link>
        </p>
      </footer>
    </main>
  );
}
