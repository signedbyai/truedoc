import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { TRUSTED_BY, VALUE_PROPS, PRICING } from "@/lib/homepage-content";
import { InteractiveProductTabsG } from "@/components/homepage-preview-g-tabs";

// Variant G, direct ask 2026-08-13: "can we try a Variant G with the
// rotating carousel to see that in action". Byte-for-byte identical to F
// apart from the tabs component — G's tabs auto-advance, F's wait for a
// tap. See homepage-preview-g-tabs.tsx for the rotation behaviour and why
// each guard (stop on tap, pause on hover/focus, honour
// prefers-reduced-motion) is there.
//
// The problem it's testing: F requires a TAP to see anything past tab 1,
// and with 92% mobile traffic and a 78% bounce rate most visitors never
// tap, so three of the four products are effectively invisible. G shows
// all four without asking for anything — the open question is whether that
// reads as helpful or as an annoying carousel, which is exactly what
// putting them side by side is for.
//
// Everything below the hero — DocuSign comparison, dev panel, trusted-by,
// pricing, FAQ — is an unmodified copy of homepage-preview-f.tsx (itself a
// copy of E's). Keep them in sync if the shared sections change.

const DOCUSIGN_COMPARISON = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat", competitor: "$10-15/mo, 1 user" },
  { label: "3 users", signedby: "$14/mo total (Team)", competitor: "$75-195/mo total, priced per user" },
];

const FAQS = [
  {
    q: "Is there a free plan?",
    a: "Yes — the Free plan includes 3 documents a month for 1 user, no credit card required.",
  },
  {
    q: "Can I sign my own documents without sending them to anyone?",
    a: "Yes. Seal lets you self-sign and lock a document with an identity-verified, RFC 3161 trusted-timestamped seal — no recipient required.",
  },
  {
    q: "Where is my data stored?",
    a: "In the EU. SignedBy is GDPR-compliant with EEA data residency.",
  },
  {
    q: "Do you use my documents to train AI models?",
    a: "No — SignedBy's AI never trains on your documents.",
  },
];

export function HomepagePreviewG({ currency }: { currency: Currency }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
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

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 sm:grid-cols-2 sm:items-start sm:pt-16">
        <div className="text-center sm:text-left">
          <Link
            href="/vs/docusign"
            className="mb-6 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
          >
            <span className="hidden sm:inline">Teams save</span>
            <span className="sm:hidden">Save</span>
            <span className="font-bold text-yellow-300">$700+/year</span>
            <span>vs DocuSign</span>
            <span className="hidden sm:inline">— see the math</span>
            <span aria-hidden>→</span>
          </Link>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">E-signatures</span>, without
            the per-seat tax
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-slate-600 sm:mx-0 sm:max-w-sm sm:text-xl">
            SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals
            and small teams who sign a handful of documents each month, not a whole sales floor.
          </p>
          <div className="mt-9 flex flex-col items-center sm:items-start">
            <CtaLink
              href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=preview-g"
              color="purple"
              page="homepage"
              position="hero"
              variant="preview-g"
            >
              Start for free →
            </CtaLink>
            <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
          </div>
        </div>

        <InteractiveProductTabsG />
      </section>

      {/* Value row — same VALUE_PROPS content the other variants use. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-8">
        <div className="grid w-full max-w-xl grid-cols-4 gap-2 border-y border-slate-100 py-4 sm:gap-4 sm:py-5">
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

      {/* Real numeric DocuSign comparison, inline rather than only a
          link-out pill. Figures copied verbatim from /vs/docusign — see
          homepage-preview-d.tsx's own comment history. */}
      <section className="mx-auto w-full max-w-2xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">The real cost difference</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* 2026-08-13 polish: below sm this used to force each of the 3
              columns into an equal 1/3 width, so the DocuSign column had to
              wrap a phrase like "$75-195/mo total, priced per user" inside
              ~100px — cramped rather than genuinely readable. Below sm, each
              row now stacks into its own block (label as a mini-heading,
              then a SignedBy line and a DocuSign line, each with the full
              row width to wrap into), and reverts to the original 3-column
              grid at sm+ where there's room. Same fix applied to D and E —
              this table's markup is identical across all three preview
              variants, so keep them in sync if it changes again. */}
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-3 sm:px-6">
            <span></span>
            <span className="text-center">SignedBy</span>
            <span className="text-center">DocuSign</span>
          </div>
          {DOCUSIGN_COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col gap-2.5 px-4 py-4 text-sm sm:grid sm:grid-cols-3 sm:items-center sm:gap-0 sm:px-6 ${i > 0 ? "border-t border-slate-100" : ""}`}
            >
              <span className="font-semibold text-slate-900 sm:font-normal sm:text-slate-600">{row.label}</span>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">SignedBy</span>
                <span className="flex-1 text-right font-semibold text-slate-900 sm:text-center">{row.signedby}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">DocuSign</span>
                <span className="flex-1 text-right text-slate-500 sm:text-center">{row.competitor}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center">
          <Link href="/vs/docusign" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            See the full comparison →
          </Link>
        </p>
      </section>

      {/* Developer/API panel — same real content as B/C/D/E, no equivalent
          elsewhere in this variant so it's kept as-is. */}
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
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 font-mono text-xs leading-relaxed text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.25)]">
            <div className="text-slate-500">POST /api/v1/documents</div>
            <div className="mt-2 text-sky-300">
              {"{"}
              <div className="pl-4">
                <span className="text-sky-300">&quot;title&quot;</span>
                <span className="text-slate-500">: </span>
                <span className="text-emerald-300">&quot;Freelance Agreement&quot;</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-sky-300">&quot;signers&quot;</span>
                <span className="text-slate-500">: [&quot;jane@acme.com&quot;]</span>
              </div>
              {"}"}
            </div>
          </div>
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
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            AI never trains on your documents
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

      {/* FAQ — same as D/E, grounded only in facts already stated
          elsewhere on the site. */}
      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Questions</h2>
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQS.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <p className="font-semibold text-slate-900">{f.q}</p>
              <p className="mt-1 text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
