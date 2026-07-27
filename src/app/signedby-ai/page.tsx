import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";
import { FlagValues } from "flags/react";

const TITLE = "SignedBy AI — control SignedBy from Claude, ChatGPT, or Mistral | SignedBy";
const DESCRIPTION =
  "Send documents and check signing status straight from an AI prompt. SignedBy AI is an MCP connector for Business-plan customers, rolling out soon.";

// Early-access teaser for a feature that isn't built yet ([[MCP server /
// agentic control]] backlog item, deferred to first Business signups) — this
// page exists so directory listings and outreach have somewhere real to
// point at instead of a dead link. Keep every claim below in "coming soon" /
// "early access" language, never "available now", until the connector
// actually ships.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/signedby-ai" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/signedby-ai" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const EARLY_ACCESS_HREF =
  "mailto:michael@sprk10.com?subject=" +
  encodeURIComponent("SignedBy AI early access") +
  "&body=" +
  encodeURIComponent("Hey — I'd like early access to SignedBy AI (the MCP connector) once it's ready.\n\nMy SignedBy account email: ");

const TOOLS = [
  { name: "list_templates", desc: "See which templates are available to send" },
  { name: "send_document", desc: "Create and send a document from a template" },
  { name: "get_document_status", desc: "Check whether a signer has signed yet" },
  { name: "list_documents", desc: "See what's still awaiting signature" },
];

const FAQ = [
  {
    q: "Is this available today?",
    a: "Not yet — SignedBy AI is built and scoped, rolling out to early Business customers as they onboard. Request early access below and you'll be one of the first.",
  },
  {
    q: "What plan will this require?",
    a: "Business. It reuses the same API key that already powers SignedBy's developer API, so there's no separate signup — just a connector URL to paste into Claude, ChatGPT, or Mistral.",
  },
  {
    q: "What can it actually do?",
    a: "Send a document from an existing template to a signer, and check status — has this been sent, opened, or signed. It sends from templates you've already built in SignedBy, not from a blank PDF.",
  },
  {
    q: "Is my document data used to train any model?",
    a: "No. The connector only relays the same document metadata already visible in your SignedBy dashboard — titles, recipients, status — to whichever AI tool you're prompting from.",
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

export default async function SignedByAiPage() {
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

      {/* Dark hero, deliberately distinct from the rest of the site's white
          marketing pages -- matches the "SignedBy AI" gallery-card treatment
          already used for the Product Hunt assets, so this reads as a
          specific launch moment rather than another plain feature page. */}
      <section className="bg-[radial-gradient(900px_600px_at_88%_-10%,#713f12_0%,#0f172a_55%)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
          <span className="rounded-full border border-yellow-300/35 bg-yellow-300/10 px-3 py-1 text-xs font-semibold text-yellow-300">
            Business plan · early access
          </span>
          <p className="text-xs font-bold uppercase tracking-wide text-yellow-300">Coming soon</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Send contracts from a{" "}
            <span className="bg-yellow-300 px-1.5 text-slate-900 rounded-[3px]">prompt.</span>
          </h1>
          <p className="max-w-xl text-base text-slate-300">
            SignedBy AI lets you control SignedBy directly from Claude, ChatGPT, or Mistral — send documents and
            check signing status without opening a dashboard.
          </p>

          <div className="mt-2 w-full max-w-sm rounded-xl bg-white p-4 text-left shadow-[0_18px_40px_-18px_rgba(15,23,42,0.5)]">
            <p className="text-xs font-semibold text-slate-500">You</p>
            <p className="mt-1.5 text-sm font-medium text-slate-900">Send the NDA template to jane@acompany.com</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              send_document
            </p>
            <p className="mt-3 border-t border-slate-200 pt-3 text-sm font-semibold text-green-600">
              Sent to jane@acompany.com
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {TOOLS.map((t) => (
              <span
                key={t.name}
                title={t.desc}
                className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs font-semibold text-slate-200"
              >
                {t.name}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2">
            <CtaLink href={EARLY_ACCESS_HREF} color={ctaColor} page="signedby-ai" position="hero">
              Request early access →
            </CtaLink>
            <p className="text-xs text-slate-400">Rolling out to Business customers first, as they onboard.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h2 className="text-lg font-semibold text-slate-900">How it&apos;ll work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Connect",
              body: "Paste your SignedBy Business API key into Claude, ChatGPT, or Mistral as a connector — same key the developer API already uses.",
            },
            {
              step: "2. Prompt",
              body: '"Send the standard NDA to jane@company.com" or "has Bob signed the services agreement yet?"',
            },
            {
              step: "3. Done",
              body: "The document sends or the status comes back, right in the conversation — no dashboard tab required.",
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
        <h2 className="text-lg font-semibold text-slate-900">Built on what already exists</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          SignedBy AI reuses the same Business-tier API key and audit trail your account already has — nothing new
          to trust, just a faster way to reach it. Sending still only works from templates you&apos;ve already built,
          the same as the developer API today.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Get on the early access list</h2>
        <p className="mt-2 text-sm text-slate-600">
          SignedBy AI is rolling out to Business customers first, in the order requests come in.
        </p>
        <CtaLink href={EARLY_ACCESS_HREF} className="mt-5" color={ctaColor} page="signedby-ai" position="footer">
          Request early access →
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
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/ai-drafter" className="underline underline-offset-2 hover:text-slate-900">
            AI Drafter
          </Link>{" "}
          ·{" "}
          <Link href="/pricing" className="underline underline-offset-2 hover:text-slate-900">
            Pricing
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
