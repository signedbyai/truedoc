import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { TRUSTED_BY, VALUE_PROPS, PRICING } from "@/lib/homepage-content";
import { InteractiveProductTabsE } from "@/components/homepage-preview-e-tabs";

// Variant E, direct ask 2026-08-13: a cleanup pass on variant D, not a new
// structure — same two-column hero, same DocuSign comparison/FAQ/dev
// panel below it. Three specific fixes, all from the same report:
//
// 1. "the pill and text on the left jumps up and down depending on what
//    hero image you are on" — the outer hero grid below changed from
//    `sm:items-center` to `sm:items-start`. This is the fix that actually
//    removes the jump: with items-center, the left column re-centers
//    itself against the row's tallest child every time the right column's
//    height changes (which it did, a lot — see
//    homepage-preview-e-tabs.tsx's own comment for the actual per-image
//    height numbers). With items-start both columns anchor to the same
//    top edge unconditionally, so the left column's position is now
//    independent of which tab is active, full stop. The fixed-height
//    image box in the tabs component is a second, complementary fix (see
//    that file) — it stops the RIGHT column's own layout from jumping
//    read-to-read, but items-start is what stops it from dragging the
//    left column along with it.
// 2. "left and right side in full screen mode would line up a bit... you
//    might have some flexibility to increase the font size on the left
//    part" — h1 grew to text-6xl (from text-5xl) and the paragraph to
//    text-xl with a narrower max-w-sm (from max-w-md, so it wraps to more
//    lines) at the sm+ breakpoint, plus slightly larger vertical spacing
//    between the headline block's elements. This closes most, not all, of
//    the height gap against the right column's now-fixed ~506px total
//    (pills + description + 380px image box) — this sandbox has no way to
//    render the actual page to check final pixel alignment (no
//    Chromium/root available here), so treat this as a strong first pass
//    and flag anything still off after a live look.
// 3. General polish: nothing else structurally changed from D — the
//    DocuSign comparison, dev/API panel, trusted-by strip, pricing grid,
//    and FAQ below are copied as-is, since none of them were part of the
//    reported issue.

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

export function HomepagePreviewE({ currency }: { currency: Currency }) {
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

      {/* Two-column hero. sm:items-start (not items-center, see this
          file's top comment) — that's the actual fix for the jump report. */}
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
              href="/login?intent=signup&utm_source=homepage&utm_medium=cta&utm_campaign=homepage_page&utm_content=preview-e"
              color="purple"
              page="homepage"
              position="hero"
              variant="preview-e"
            >
              Start for free →
            </CtaLink>
            <p className="mt-3 text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
          </div>
        </div>

        <InteractiveProductTabsE />
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
          <div className="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
            <span></span>
            <span className="text-center">SignedBy</span>
            <span className="text-center">DocuSign</span>
          </div>
          {DOCUSIGN_COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 items-center px-4 py-4 text-sm sm:px-6 ${i > 0 ? "border-t border-slate-100" : ""}`}
            >
              <span className="text-slate-600">{row.label}</span>
              <span className="text-center font-semibold text-slate-900">{row.signedby}</span>
              <span className="text-center text-slate-500">{row.competitor}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center">
          <Link href="/vs/docusign" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            See the full comparison →
          </Link>
        </p>
      </section>

      {/* Developer/API panel — same real content as B/C/D, no equivalent
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

      {/* FAQ — same as D, grounded only in facts already stated elsewhere
          on the site. */}
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
