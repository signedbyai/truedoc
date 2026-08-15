import Image from "next/image";
import Link from "next/link";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { FEATURES, TRUSTED_BY, VALUE_PROPS, PRICING } from "@/lib/homepage-content";

// Variant C, direct ask 2026-08-12: "take the best parts of B and v26 and
// combine them together." B is the live homepage (HomepageTier1Preview,
// promoted from /home-preview-b) — animated Sign/Seal/Quote/Draft hero
// crossfade, a screenshot-paired "Why SignedBy" reasons section, and a
// Developer/API panel. v26 (homepage-versions/homepage-v026-current.tsx) is
// the homepage as it stood immediately before B's promotion — a static
// product screenshot in the hero (field editor + phone overlay, both real
// captures, visible instantly with no animation to wait for), a VALUE_PROPS
// icon strip, and a FEATURES card grid, none of which survived into B.
//
// What this keeps from each, and why:
// - FROM v26: the static hero screenshot (proof visible on first paint,
//   not after a multi-second crossfade cycle — and this whole session's
//   history of crossfade timing/sizing bugs is itself an argument for the
//   simpler, unanimated version where it's not load-bearing), the
//   VALUE_PROPS strip, and the FEATURES card grid (breadth — concrete
//   mechanics like multi-signer routing and audit logging that the
//   Sign/Seal/Quote/Draft framing below doesn't individually cover).
// - FROM B: the "Why SignedBy" screenshot-paired reasons section (real
//   per-feature screenshots, not just adjective bullets) and the
//   Developer/API panel (technical-buyer appeal, no equivalent in v26).
// - DROPPED: B's animated hero crossfade + intro badge row. Not a knock on
//   the visual — it's that the static shot already does the "this is a
//   real product" job the crossfade does, without the ongoing animation-
//   timing/sizing maintenance burden this session spent many passes on.
//   The Sign screenshot specifically is dropped from the reasons section
//   below (kept in B) since the hero above already covers it — showing
//   the same composite twice reads as padding, not reinforcement.
//
// Copy (headline/subhead/value props/features/pricing) is the same
// proven wording used everywhere else on the site — this is a structure/
// layout combination exercise, not a copy test, so nothing about the
// words changes here.

const REASONS: {
  title: string;
  description: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  Icon: typeof Signature;
}[] = [
  {
    title: "Seal",
    description:
      "Self-sign and lock a document with an identity-verified, RFC 3161 trusted-timestamped seal — no recipient required.",
    image: "/hero-verified-badge-invoice-d.png",
    alt: "An invoice with the SignedBy Verified & Sealed medallion stamped over its top-right corner",
    width: 740,
    height: 650,
    Icon: ShieldCheck,
  },
  {
    title: "Quote",
    description: "Describe the job in plain language and Magic Quote turns it into a signable, itemized quote.",
    image: "/hero-magic-quote.png",
    alt: "The Magic Quote itemized editor: quote title, currency, bill-to, and line items with computed totals",
    width: 568,
    height: 483,
    Icon: Receipt,
  },
  {
    title: "Draft",
    description: "Describe what you need and AI drafts a ready-to-send agreement — review, edit, and send in the same flow.",
    image: "/hero-new-document-draft.png",
    alt: "The Draft tab: document type and language pickers, a plain-language description, and a Generate draft button",
    width: 567,
    height: 513,
    Icon: Sparkles,
  },
];

// Same content/markup as DeveloperApiSection in homepage-tier1-preview.tsx
// (see that file's own comment for the documenso.com research behind it) —
// duplicated here rather than imported so this preview stays a self-
// contained file, same convention homepage-current.tsx/homepage-tier1-
// preview.tsx already established (each preview owns its own copy rather
// than importing from a sibling preview that might change independently).
type JsonTok = { t: string; c?: string };
const jline = (...toks: JsonTok[]) => toks;
const KEY = "text-sky-300";
const STR = "text-emerald-300";
const LIT = "text-amber-300";
const PUNCT = "text-slate-500";

const JSON_LINES: JsonTok[][] = [
  jline({ t: "{", c: PUNCT }),
  jline({ t: '  "id"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"7fdd90eb-9152-4031-a767-c0632126dc53"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "title"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"Freelance Agreement"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "status"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"completed"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "created_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-28T10:04:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "updated_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-29T09:11:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '  "expires_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: "null", c: LIT }, { t: ",", c: PUNCT }),
  jline({ t: '  "signers"', c: KEY }, { t: ": [", c: PUNCT }),
  jline({ t: "    {", c: PUNCT }),
  jline({ t: '      "email"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"jane@acme.com"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "name"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"Jane"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "status"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"signed"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "signed_at"', c: KEY }, { t: ": ", c: PUNCT }, { t: '"2026-07-29T09:11:00Z"', c: STR }, { t: ",", c: PUNCT }),
  jline({ t: '      "auth_required"', c: KEY }, { t: ": ", c: PUNCT }, { t: "false", c: LIT }, { t: ",", c: PUNCT }),
  jline({ t: '      "auth_verified"', c: KEY }, { t: ": ", c: PUNCT }, { t: "false", c: LIT }),
  jline({ t: "    }", c: PUNCT }),
  jline({ t: "  ]", c: PUNCT }),
  jline({ t: "}", c: PUNCT }),
];

function JsonPanelContent() {
  return (
    <>
      {JSON_LINES.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {line.map((tok, j) => (
            <span key={j} className={tok.c}>
              {tok.t}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function DeveloperApiSection() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <div className="text-center sm:text-left">
          <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
            <Image
              src="/brand/signedby-badge-black-small.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg"
            />
            <h2 className="text-lg font-semibold text-slate-900">Wire in your CRM</h2>
          </div>
          <p className="mx-auto max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">
            A REST API and outbound webhooks — create and send documents from your CRM, poll status, or get
            notified the moment something&apos;s signed.
          </p>
          <Link
            href="/developers"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
          >
            Check the API docs <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="relative h-64 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="ml-2 font-mono">GET /api/v1/documents/{"{id}"}</span>
          </div>
          <div className="h-[calc(100%-2.75rem)] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-json-scroll px-4 py-4 font-mono text-xs leading-relaxed">
              <JsonPanelContent />
              <div className="mt-4" aria-hidden="true">
                <JsonPanelContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomepagePreviewC({ currency }: { currency: Currency }) {
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
          href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=preview-c"
          className="mt-7"
          color="purple"
          page="homepage"
          position="hero"
          variant="preview-c"
        >
          Start for free →
        </CtaLink>
        <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      {/* Static hero product shot (from v26) — real captures, both halves
          of the flow (sender placing fields, signer finishing on a
          phone), visible on first paint rather than after a crossfade
          cycle. See homepage-v026-current.tsx for the original sizing
          notes this reuses verbatim. */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-8 sm:pr-12">
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

      {/* Value row (from v26) — quick scannable strip right under the
          hero shot rather than competing with the CTA above it. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-4">
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

      {/* "Why SignedBy" (from B) — Seal/Quote/Draft only. Sign is dropped
          here since the hero above already shows it (same composite);
          repeating it would read as padding, not reinforcement. */}
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Why SignedBy</h2>
        <div className="flex flex-col gap-16">
          {REASONS.map((r, i) => (
            <div key={r.title} className="grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-10">
              <div className={`text-center sm:text-left ${i % 2 === 1 ? "sm:order-1" : "sm:order-2"}`}>
                <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 sm:justify-start">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900">
                    <r.Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  {r.title}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">{r.description}</p>
              </div>
              <div
                className={`overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] ${i % 2 === 1 ? "sm:order-2" : "sm:order-1"}`}
              >
                <Image
                  src={r.image}
                  alt={r.alt}
                  width={r.width}
                  height={r.height}
                  sizes="(min-width: 640px) 24rem, 90vw"
                  className="h-auto w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Developer/API panel (from B) */}
      <DeveloperApiSection />

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
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            AI never trains on your documents
          </Link>
        </div>
      </section>

      {/* Feature grid (from v26) — breadth: concrete mechanics not
          individually covered by the Sign/Seal/Quote/Draft framing
          above. */}
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
