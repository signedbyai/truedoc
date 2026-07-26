import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import { Logo } from "@/components/logo";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";
import { TEMPLATE_PAGES } from "@/lib/template-pages";

const TITLE = "Free Document Templates — Agreements & Contracts";
const DESCRIPTION =
  "Free, ready-to-use templates for freelance agreements, NDAs, waivers, rental agreements, and more. Copy the example or send it for e-signature in minutes.";
// This route has its own colocated opengraph-image.tsx, so -- unlike
// /vs/*, which has no image file of its own and has to explicitly point
// back at the root layout's opengraph-image.tsx -- openGraph/twitter here
// omit `images` entirely and let Next auto-merge the route-scoped one in.
// Same pattern as /quiz. (/templates/[slug] has its own dynamic version,
// one per template, in that segment's opengraph-image.tsx.)
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/templates" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/templates" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function TemplatesIndexPage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Free Document Templates</h1>
        <p className="max-w-xl text-base text-slate-600">
          Real, complete templates you can use as-is — freelance agreements, NDAs, waivers, and more. Copy what you
          need, or sign up free to send one for e-signature.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATE_PAGES.map((t) => (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
            >
              <h2 className="text-base font-semibold text-slate-900">{t.h1}</h2>
              <p className="mt-1.5 text-sm text-slate-600">{t.intro[0]}</p>
              <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
                View template →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Need something else signed?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload any PDF, or describe what you need and let AI draft a starting point.
        </p>
        <div className="mt-5 flex flex-col items-center gap-2">
          <CtaLink href="/login?intent=signup" color={ctaColor} page="templates" position="footer">
            Start for free →
          </CtaLink>
          <p className="text-xs text-slate-400">Free on every plan, including Free. No credit card required.</p>
        </div>
        <div className="mt-5">
          <LanguageSupportRow />
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/signnow" className="hover:text-slate-600">
            SignedBy vs SignNow
          </Link>
          <Link href="/vs/docusign" className="hover:text-slate-600">
            SignedBy vs DocuSign
          </Link>
          <Link href="/vs/pandadoc" className="hover:text-slate-600">
            SignedBy vs PandaDoc
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
