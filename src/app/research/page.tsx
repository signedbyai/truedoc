import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

// /research index (2026-08-15). Deliberately a real section rather than a
// single orphan post: the EuroLTV/preservation material is the obvious
// second piece, and a parent route that 404s while the child is on Hacker
// News looks careless.
//
// Not called /blog on purpose. "Blog" sets an expectation of cadence that a
// company this size will not meet, and a stale blog signals abandonment --
// especially bad next to writing about long-term durability. "Research"
// carries no such implied schedule.

const TITLE = "Research — SignedBy";
const DESCRIPTION =
  "Original research on electronic signatures, timestamps and long-term validity — with reproducible method and the tools to check our findings yourself.";

const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/research" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/research", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const POSTS: { slug: string; title: string; date: string; dateLabel: string; excerpt: string }[] = [
  {
    slug: "signed-pdf-proof-expiry",
    title: "Your signed documents have an expiry date on their proof",
    date: "2026-08-15",
    dateLabel: "15 August 2026",
    excerpt:
      "Every electronically signed document has a date after which you can no longer demonstrate it was validly signed. We tested whether archive timestamps fix it — they moved the horizon zero days, and 319 days backwards with one authority.",
  },
];

export default function ResearchIndexPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="hover:opacity-80">
          <Image
            src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
            alt="SignedBy"
            width={266}
            height={64}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl px-6 pt-10 pb-16">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Research</h1>
        <p className="mt-4 text-lg text-slate-600">
          Things we found out by testing rather than assuming — with the method written down, so you can check whether
          we got it right.
        </p>

        <ul className="mt-12 space-y-10">
          {POSTS.map((p) => (
            <li key={p.slug}>
              <p className="text-sm text-slate-500">{p.dateLabel}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                <Link href={`/research/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-slate-600">{p.excerpt}</p>
              <Link
                href={`/research/${p.slug}`}
                className="mt-2 inline-block text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Read →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
