import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs DocuSign — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to DocuSign eSignature on price, envelope limits, and AI-assisted features. Flat $7/mo unlimited plan vs DocuSign's per-envelope, per-user pricing.";

// A page that sets its own metadata.openGraph/twitter -- even without an
// images field -- stops Next.js from auto-inheriting the root layout's
// opengraph-image.tsx (unlike a page with no metadata override at all,
// e.g. the homepage, which gets it for free). So every page overriding
// title/description here has to explicitly point back at it, or it gets
// no preview image at all (confirmed via curl -- this page and /quiz were
// both silently missing an og:image/twitter:image tag before this).
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/docusign" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/docusign", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat", competitor: "Personal: $10-15/mo, 1 user" },
  { label: "Document/envelope limits on that plan", signedby: "Unlimited documents", competitor: "5 envelopes per month" },
  { label: "Next tier up, 3 users", signedby: "$14/mo total (Team)", competitor: "~$75-195/mo total (Standard/Business Pro, priced per user)" },
  { label: "Metered add-on fees", signedby: "None — flat pricing", competitor: "Extra charges for SMS delivery, ID verification, and notifications" },
];

const FEATURE_ROWS: Row[] = [
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not in standard eSignature plans (separate higher-tier IAM platform)" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not offered in standard eSignature plans" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered — no quoting/estimating tool in standard eSignature plans" },
  { label: "Per-page signer engagement tracking (dwell time per page)", signedby: "Included (Pro+)", competitor: "Not included in standard eSignature plans" },
  { label: "Mobile signing UX", signedby: "Field-by-field guided mode", competitor: "Standard pinch-and-zoom PDF view" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not offered" },
  { label: "Company / primary AI processing location", signedby: "Netherlands (EU); Mistral AI (France) by default", competitor: "United States" },
  { label: "Audit trail, ESIGN/UETA compliance", signedby: "Included", competitor: "Included" },
  { label: "Payment collection", signedby: "Business ($29/mo)", competitor: "Business Pro ($40-65/user/mo)" },
  { label: "API access + outbound webhooks", signedby: "Included in Business ($29/mo) — multi-signer create, list/void, signed-file download, webhooks", competitor: "Not included in any standard eSignature plan — requires a separate, envelope-volume-priced Developer plan" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>DocuSign</span>
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

export default async function VsDocuSignPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs DocuSign</h1>
        <p className="max-w-xl text-lg text-slate-600">
          DocuSign is built for enterprise procurement — envelope caps, per-user pricing, and add-on fees. SignedBy is
          a flat $7/mo, built for solo professionals and small teams who don&apos;t need any of that.
        </p>
        <CtaLink href="/login?intent=signup" color={ctaColor} page="vs-docusign" position="hero">
          Start for free →
        </CtaLink>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-8">
        <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
        <CompareTable title="Pricing" rows={PRICING_ROWS} />
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="text-lg font-semibold text-slate-900">Features</h2>
        <CompareTable title="Feature" rows={FEATURE_ROWS} />
        <p className="mt-4 text-xs text-slate-400">
          Pricing and feature details as of July 2026, based on DocuSign&apos;s publicly listed eSignature plans —
          always confirm current rates directly with DocuSign, since providers change plans without notice. DocuSign
          is a registered trademark of Docusign, Inc.; SignedBy is not affiliated with or endorsed by DocuSign.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href="/login?intent=signup" className="mt-5" color={ctaColor} page="vs-docusign" position="footer">
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
          <Link href="/vs/pandadoc" className="hover:text-slate-600">
            SignedBy vs PandaDoc
          </Link>
          <Link href="/vs/hix" className="hover:text-slate-600">
            SignedBy vs Hix
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
