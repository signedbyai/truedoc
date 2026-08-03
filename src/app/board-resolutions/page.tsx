import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";
import { TEMPLATE_PAGES } from "@/lib/template-pages";

const TITLE = "Board Resolutions & Shareholder Consents — Sign in Minutes | SignedBy";
const DESCRIPTION =
  "Get board resolutions and shareholder consents signed by every director or shareholder in minutes — free templates included, from $7/mo. No governance platform, no per-seat pricing.";

// This route has no colocated opengraph-image.tsx of its own, so -- same as
// /vs/* -- it has to explicitly point back at the root layout's shared one,
// or it silently gets no preview image at all.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/board-resolutions" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/board-resolutions", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

// The two new template-library entries this page exists to point at (see
// template-pages.ts) -- pulled by slug rather than hardcoded again here, so
// this page and /templates stay in sync automatically if that content ever
// moves.
const RESOLUTION_TEMPLATE_SLUGS = ["board-resolution-template", "shareholder-consent-template"];
const resolutionTemplates = TEMPLATE_PAGES.filter((t) => RESOLUTION_TEMPLATE_SLUGS.includes(t.slug));

// utm_* added 2026-08-01 (see [[signup-attribution]]) — previously untagged.
const SIGNUP_HREF = "/login?intent=signup&utm_source=board_resolutions&utm_medium=cta&utm_campaign=board_resolutions_page";

const WHY = [
  {
    title: "Real templates, not a blank page",
    body: "Generic e-signature tools don't know what a board resolution looks like — you're starting from a blank document or hunting one down online. SignedBy ships with real unanimous-written-consent templates for both directors and shareholders, ready to customize and reuse.",
  },
  {
    title: "Not a governance platform",
    body: "Diligent, Athennian, and Boardvantage are built for companies with a corporate secretary managing minute books, cap tables, and compliance calendars — and priced accordingly. If all you actually need is signatures on routine resolutions, you're paying for a lot you'll never open.",
  },
  {
    title: "Every signer tracked individually",
    body: "Add as many directors or shareholders as the resolution needs — each gets their own signature block, and you can see exactly who's signed and who hasn't without chasing anyone down over email.",
  },
];

const FAQ = [
  {
    q: "Do I need a lawyer to use these templates?",
    a: "For routine, everyday actions — opening a bank account, appointing an officer, approving a standard contract — most small companies use a template like this directly. For a major decision (a merger, a new equity issuance, an amendment to your articles of incorporation), have a lawyer confirm the specific requirements for your jurisdiction first.",
  },
  {
    q: "How many directors or shareholders can sign one document?",
    a: "As many as the resolution needs — add one recipient per signer and each gets their own tracked signature block. This isn't limited to two parties the way a lot of simple e-signature flows are.",
  },
  {
    q: "Is an e-signed board resolution or shareholder consent legally valid?",
    a: "Yes. Written consent in lieu of a meeting is standard corporate practice under most states' corporate law and similar statutes elsewhere, and an e-signature carries the same legal weight as a wet-ink one under the U.S. ESIGN Act, UETA, and the EU's eIDAS regulation.",
  },
  {
    q: "What plan do I need?",
    a: "Sending a resolution to multiple signers works on every plan, including Free (3 documents a month). Saving it as a reusable template — so you're not rebuilding it from scratch every time the board acts — is included starting on the Pro plan ($7/mo).",
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

export default async function BoardResolutionsPage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">For small companies & founders</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Board resolutions, signed. Not managed.</h1>
        <p className="max-w-xl text-base text-slate-600">
          Routine board and shareholder approvals shouldn&apos;t need a governance platform built for a company with a
          full-time corporate secretary. Send the resolution, everyone signs, you&apos;re done.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={SIGNUP_HREF} color={ctaColor} page="board-resolutions" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
        </div>
        <LanguageSupportRow />
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
        <h2 className="text-lg font-semibold text-slate-900">Start from a real template</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {resolutionTemplates.map((t) => (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
            >
              <h3 className="text-base font-semibold text-slate-900">{t.h1}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{t.intro[0]}</p>
              <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
                View template →
              </span>
            </Link>
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
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="board-resolutions" position="footer">
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
