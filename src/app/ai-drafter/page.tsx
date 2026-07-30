import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";
import { AI_DRAFT_DISCLAIMER, DOCUMENT_TYPES, DRAFT_LANGUAGES } from "@/lib/ai-draft-types";

const TITLE = "AI Drafter — describe a contract, get a real first draft | SignedBy";
const DESCRIPTION =
  "Describe the agreement you need in plain language and SignedBy's AI Drafter writes a real starting document — freelance agreements, NDAs, waivers, and more, in 7 languages. Included on the Pro plan, $7/mo.";

// This route has its own colocated opengraph-image.tsx, so -- unlike
// /vs/* and /templates/[slug], which have no image file of their own and
// have to explicitly point back at the root layout's opengraph-image.tsx --
// openGraph/twitter here omit `images` entirely and let Next auto-merge the
// route-scoped one in. Setting images explicitly here would override it
// right back to the generic homepage image. Same pattern as /quiz.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-drafter" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/ai-drafter" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// mode=draft opens the AI Drafter tab directly (see new-document-client.tsx's
// initialMode) rather than dropping someone on the Upload tab and making
// them find it themselves — the whole point of a feature-specific landing
// page is that the click matches the destination.
const START_HREF = "/login?intent=signup&next=" + encodeURIComponent("/dashboard/documents/new?mode=draft");

const FAQ = [
  {
    q: "Is this legal advice?",
    a: "No. AI Drafter writes a real starting document based on what you describe, but SignedBy is not a law firm and this isn't a substitute for one. Review every draft carefully, and have a licensed attorney look at anything high-stakes, unusual, or high-value before you send it.",
  },
  {
    q: "What plan do I need?",
    a: "AI Drafter is included on the Pro plan ($7/mo, unlimited documents). Signing up itself is free, and the Free plan can still send documents you write yourself or upload — the AI drafting step is what needs Pro.",
  },
  {
    q: "What languages does it support?",
    a: `${DRAFT_LANGUAGES.map((l) => l.label).join(", ")} — both the document itself and the describe-it form are translated, not just the output.`,
  },
  {
    q: "What if my agreement doesn't match one of the listed types?",
    a: "Pick General and describe what you need — it isn't limited to the named categories, those are just the common starting points most people are looking for.",
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

export default async function AiDrafterPage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Drafter</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Describe the contract. Get a real draft back.
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Most &ldquo;AI contract&rdquo; tools fill in a generic template. AI Drafter writes an actual starting
          document from what you describe — the deal, the parties, the specifics — not a form letter with the blanks
          swapped out.
        </p>
        <p className="max-w-xl text-sm text-slate-500">
          {"e.g. "}
          <span className="italic">
            &ldquo;3-month logo design project, $2,000 total, net-30, client owns the final files&rdquo;
          </span>
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={START_HREF} color={ctaColor} page="ai-drafter" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">
            AI Drafter is included on the Pro plan ($7/mo). Signing up is free.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Describe it",
              body: "A sentence or two — what kind of agreement, who's involved, the key terms.",
            },
            {
              step: "2. Review a real draft",
              body: "SignedBy writes the actual document. Edit anything before it becomes final — nothing is saved until you confirm it.",
            },
            {
              step: "3. Send for signature",
              body: "The draft becomes a normal SignedBy document — fields, audit trail, ESIGN/UETA compliant, same as anything you upload.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">What it drafts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
            >
              {t.labels.en}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Available in {DRAFT_LANGUAGES.length} languages: {DRAFT_LANGUAGES.map((l) => l.label).join(", ")}.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">A real starting point, not legal advice</h2>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {AI_DRAFT_DISCLAIMER}
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try AI Drafter</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free to sign up. AI Drafter itself is included on Pro, $7/mo — unlimited documents, one user.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="ai-drafter" position="footer">
          Start for free →
        </CtaLink>
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

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="text-sm text-slate-500">
          Also on SignedBy:{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/templates" className="underline underline-offset-2 hover:text-slate-900">
            Free templates
          </Link>{" "}
          ·{" "}
          <Link href="/vs/docusign" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs DocuSign
          </Link>{" "}
          ·{" "}
          <Link href="/vs/signnow" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs SignNow
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
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
