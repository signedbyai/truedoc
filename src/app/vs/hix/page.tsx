import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Hix (Hix Signing) — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Hix Signing: flat $7/mo self-serve e-signing with AI features vs Hix's demo-led, integration-heavy platform for Dutch accountancy firms.";

// See the note on /vs/signnow: a page overriding metadata must point back at
// the shared opengraph image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/hix" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/hix", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat, unlimited documents", competitor: "Not publicly listed — demo- and quote-based" },
  { label: "How you start", signedby: "Self-serve signup; free tier (3 documents/mo), no card", competitor: "Book a demo; guided setup with a test account" },
  { label: "Pricing model", signedby: "Flat fee, published rates, no per-seat math", competitor: "Modular — pay per module; priced per firm on request" },
];

const FEATURE_ROWS: Row[] = [
  { label: "No-login email signing for recipients", signedby: "Yes — single-use link, sign in the browser", competitor: "Yes — one button in an email, no login" },
  { label: "Get started without a sales call", signedby: "Yes — sign up and send in minutes", competitor: "No — starts with a demo and a guided onboarding" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not offered" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered — Hix's modules are document requests, questionnaires, and VAT reminders, not quoting" },
  { label: "Native integrations with accounting/payroll software", signedby: "REST API (Business); no native bookkeeping integrations", competitor: "2000+ integrations (AFAS, Exact Online, Nextens, SnelStart…) — its core strength" },
  { label: "API access + outbound webhooks", signedby: "Included in Business ($29/mo), self-serve — multi-signer create, list/void, signed-file download, webhooks", competitor: "Yes — public REST API with webhooks (60 requests/min); pricing not published, quoted per firm" },
  { label: "Per-page signer engagement tracking (dwell time)", signedby: "Included (Pro+)", competitor: "Status tracking only (signed / outstanding / reminders)" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not advertised (encrypted storage + audit trail)" },
  { label: "Scope", signedby: "Focused e-signature tool", competitor: "Broader client-comms suite — signing is one module (also doc requests, questionnaires, VAT reminders)" },
  { label: "Primary market / language", signedby: "Global, English", competitor: "Netherlands, Dutch" },
  { label: "Compliance & EU footprint", signedby: "ESIGN/UETA + GDPR; Netherlands-based, EU hosting; open DPA/sub-processor list", competitor: "GDPR (AVG), legally valid signatures, encrypted storage; Dutch product" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Hix Signing</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-3 gap-2 border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-600">{r.label}</span>
          <span className="font-medium text-slate-900">{r.signedby}</span>
          <span className="text-slate-500">{r.competitor}</span>
        </div>
      ))}
    </div>
  );
}

export default async function VsHixPage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Hix Signing</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Both keep signing simple and GDPR-compliant, with no login for signers. The difference is fit: SignedBy is
          self-serve at a flat $7/mo — sign up and send today, with AI-assisted drafting and field placement. Hix is a
          Dutch platform for accountancy firms, built around deep integrations with bookkeeping software and hands-on
          onboarding.
        </p>
        <CtaLink href="/login?intent=signup" color={ctaColor} page="vs-hix" position="hero">
          Start for free →
        </CtaLink>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Which one is for you?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose SignedBy if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You&apos;re a solo professional or small team who wants to send a document for signature today — at a
              flat, published price, with AI help drafting and placing fields, and no sales call or setup project.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose Hix if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You&apos;re a Dutch accountancy or administration firm that wants signing embedded in your existing
              bookkeeping stack (AFAS, Exact Online, and so on), with guided onboarding and a broader client-comms
              suite around it.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-8">
        <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
        <CompareTable title="Pricing" rows={PRICING_ROWS} />
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="text-lg font-semibold text-slate-900">Features</h2>
        <CompareTable title="Feature" rows={FEATURE_ROWS} />
        <p className="mt-4 text-xs text-slate-400">
          Details as of July 2026, based on Hix&apos;s public website (hellohix.com); Hix does not publish its pricing,
          which is quoted per firm. Always confirm current details directly with Hix. Hix and Hix Signing are trademarks
          of their respective owner; SignedBy is not affiliated with or endorsed by Hix.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href="/login?intent=signup" className="mt-5" color={ctaColor} page="vs-hix" position="footer">
          Start for free →
        </CtaLink>
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
          <Link href="/vs/bolosign" className="hover:text-slate-600">
            SignedBy vs BoloSign
          </Link>
          <Link href="/vs/adobe" className="hover:text-slate-600">
            SignedBy vs Adobe
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Free templates
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
