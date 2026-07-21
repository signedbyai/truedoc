import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { TEMPLATE_PAGES, findTemplatePage } from "@/lib/template-pages";

// Same og:image gotcha as /vs/docusign and /quiz — any page that sets its
// own metadata.openGraph has to explicitly repoint at the shared image, or
// Next silently drops the preview image instead of inheriting the root
// layout's.
const SHARED_IMAGE = ["/opengraph-image"];
const BASE_URL = "https://signedby.ai";

export function generateStaticParams() {
  return TEMPLATE_PAGES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = findTemplatePage(slug);
  if (!page) return {};

  const url = `${BASE_URL}/templates/${page.slug}`;
  return {
    title: page.seoTitle,
    description: page.metaDescription,
    alternates: { canonical: `/templates/${page.slug}` },
    openGraph: { title: page.seoTitle, description: page.metaDescription, url, images: SHARED_IMAGE },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.metaDescription, images: SHARED_IMAGE },
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = findTemplatePage(slug);
  if (!page) notFound();

  const otherTemplates = TEMPLATE_PAGES.filter((t) => t.slug !== page.slug);

  // The honest version of "use this template with AI": AI drafting is a
  // Starter-plan feature (see plan.ts's aiDraft gate), so this can't promise
  // free AI customization to a brand-new signup. Signing up and pasting the
  // example text into a document is free on every plan; the AI-assisted
  // rewrite is what needs Starter. ?type= preselects the right template in
  // the AI Drafter once they get there either way (see
  // dashboard/documents/new/page.tsx).
  const useTemplateHref = `/login?intent=signup&next=${encodeURIComponent(
    `/dashboard/documents/new?type=${page.documentType}`
  )}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-white">
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Free template</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{page.h1}</h1>
        {page.intro.map((p, i) => (
          <p key={i} className="max-w-xl text-base text-slate-600">
            {p}
          </p>
        ))}
        <div className="mt-2 flex flex-col items-center gap-2">
          <Link
            href={useTemplateHref}
            className={buttonVariants({ variant: "cta", size: "lg" })}
          >
            Use this template — free →
          </Link>
          <p className="text-xs text-slate-400">
            Sign up free to send it. AI-assisted customization is included on the Starter plan ($7/mo).
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Example: {page.example.title}</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <pre className="max-h-[36rem] overflow-y-auto whitespace-pre-wrap px-5 py-5 font-mono text-xs leading-relaxed text-slate-700">
            {page.example.body}
          </pre>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          This is a real, complete example — copy the text you need, or sign up to send it (or an AI-customized
          version of it) for e-signature.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Send it for signature</h2>
        <p className="mt-2 text-sm text-slate-600">
          3 free documents a month, no credit card. Upload this template or start from the AI Drafter.
        </p>
        <Link
          href={useTemplateHref}
          className={cn(buttonVariants({ variant: "cta", size: "lg" }), "mt-5")}
        >
          Start for free →
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-12">
        <h2 className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {page.faq.map((item) => (
            <div key={item.q} className="px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Other free templates</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {otherTemplates.map((t) => (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              {t.h1}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Comparing tools instead?{" "}
          <Link href="/vs/signnow" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs SignNow
          </Link>{" "}
          ·{" "}
          <Link href="/vs/docusign" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs DocuSign
          </Link>{" "}
          ·{" "}
          <Link href="/vs/pandadoc" className="underline underline-offset-2 hover:text-slate-900">
            SignedBy vs PandaDoc
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/templates" className="hover:text-slate-600">
            All templates
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
