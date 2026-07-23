import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FlagValues } from "flags/react";
import { Logo } from "@/components/logo";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "Magic Quote — describe the job, get a line-item price quote | SignedBy";
const DESCRIPTION =
  "Describe a job in plain language and SignedBy's Magic Quote builds a line-item price quote you can review and edit — it becomes a real signable document instantly. On every plan, including Free.";

// This route has its own colocated opengraph-image.tsx, so -- unlike
// /vs/* and /templates/[slug], which have no image file of their own and
// have to explicitly point back at the root layout's opengraph-image.tsx --
// openGraph/twitter here omit `images` entirely and let Next auto-merge the
// route-scoped one in. Setting images explicitly here would override it
// right back to the generic homepage image. Same pattern as /quiz.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/magic-quote" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/magic-quote" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// mode=quote opens the Magic Quote tab directly (see new-document-client.tsx's
// initialMode) instead of dropping someone on the Upload tab.
const START_HREF = "/login?intent=signup&next=" + encodeURIComponent("/dashboard/documents/new?mode=quote");

const FAQ = [
  {
    q: "Does the AI do the math?",
    a: "No. The AI only reads your description and pulls out line items and prices you already stated — every subtotal, tax amount, and total is computed by the app's own code, not the AI, and recalculates live if you edit anything.",
  },
  {
    q: "What plan do I need?",
    a: "None — Magic Quote is free on every plan, including Free. Sending the finished quote for signature follows the same document limits as any other SignedBy document (3/month on Free, unlimited on Starter+).",
  },
  {
    q: "What happens after I generate a quote?",
    a: "You land on a review screen — edit the title, currency, line items, quantities, prices, and tax rate before anything is saved. Once you confirm, it becomes a normal signable SignedBy document with fields, audit trail, and ESIGN/UETA compliance.",
  },
  {
    q: "What currencies does it support?",
    a: "Magic Quote defaults to your local currency automatically and lets you switch to any of SignedBy's supported currencies before you send.",
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

export default async function MagicQuotePage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Magic Quote</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Describe the job. Get a real price quote.
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Skip the spreadsheet. Describe what you&apos;re quoting and Magic Quote pulls out the line items and prices
          you mentioned, then hands you an editable quote — ready to send for signature in the same document.
        </p>
        <p className="max-w-xl text-sm text-slate-500">
          {"e.g. "}
          <span className="italic">
            &ldquo;iPhone 13 screen replacement for Alice, $80 for the part, 1 hour labor at $70/hr&rdquo;
          </span>
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <CtaLink href={START_HREF} color={ctaColor} page="magic-quote" position="hero">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">Free on every plan, including Free. No credit card required.</p>
        </div>
      </section>

      {/* Real product screenshot, not an illustration — same rationale as the
          homepage's hero shot: it doubles as proof and reads as ours, not
          templated stock art. This page previously had zero visual content,
          which stood out once analytics showed it drawing more traffic than
          the homepage itself. */}
      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
          <Image
            src="/hero-magic-quote.png"
            alt="Magic Quote review screen showing an AI-generated line-item quote with editable line items and computed totals"
            width={592}
            height={946}
            priority
            sizes="(max-width: 640px) 90vw, 384px"
            className="h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Describe the job",
              body: "A sentence or two — what you're quoting, quantities, and the prices you already have in mind.",
            },
            {
              step: "2. Review the line items",
              body: "Edit descriptions, quantities, prices, and tax rate. Totals recompute live from your numbers, not the AI's.",
            },
            {
              step: "3. Send for signature",
              body: "Confirm and it becomes a normal SignedBy document — fields, audit trail, ESIGN/UETA compliant, ready to sign.",
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
        <h2 className="text-lg font-semibold text-slate-900">Math you can trust</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          The AI never calculates a subtotal, tax amount, or total — it only reads the numbers you describe. Every
          total on screen and in the final PDF is computed by SignedBy&apos;s own code, and recalculates instantly if
          you change a quantity, price, or tax rate.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try Magic Quote</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free on every plan, including Free — no credit card, no upgrade required to try it.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="magic-quote" position="footer">
          Start for free →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
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
          <Link href="/ai-drafter" className="underline underline-offset-2 hover:text-slate-900">
            AI Drafter
          </Link>{" "}
          ·{" "}
          <Link href="/signedby-ai" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy AI
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
