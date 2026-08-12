import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Eurosign — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Eurosign on price, envelope limits, and AI-assisted features. Flat $7/mo unlimited plan vs Eurosign's per-user, per-envelope pricing and demo-gated free trial.";

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
  alternates: { canonical: "/vs/eurosign" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/eurosign", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const SIGNUP_HREF = "/login?intent=signup&utm_source=vs_eurosign&utm_medium=cta&utm_campaign=vs_eurosign_page";

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat", competitor: "Business Pro: €19/mo/user (billed annually), €24/mo billed monthly — 1 user" },
  { label: "Document/envelope limits on that plan", signedby: "Unlimited documents", competitor: "Unlimited envelopes on Business Pro; or pay-per-envelope Starter Pack at €1/envelope (49 for €49, no subscription)" },
  { label: "3-user tier", signedby: "$14/mo total (Team)", competitor: "€29/mo total (Business Pro+, billed annually), €34/mo billed monthly — 3 users included" },
  { label: "Self-serve free trial", signedby: "3 documents/month, no credit card, sign up instantly", competitor: "No self-serve free plan — free trial requires booking a demo call" },
  { label: "4+ users, bulk sending, or API access", signedby: "Team ($14/mo) and Business ($29/mo) — no sales call required", competitor: "Custom Plan only — contact sales, no published pricing" },
];

const FEATURE_ROWS: Row[] = [
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not offered — fields (signature, text, date, stamps) are placed manually" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Per-page signer engagement tracking (dwell time per page)", signedby: "Included (Pro+)", competitor: "Not offered — open/sign/refuse notifications only" },
  { label: "Mobile signing UX", signedby: "Field-by-field guided mode", competitor: "Standard pinch-and-zoom PDF view" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not offered" },
  { label: "Company / primary data location", signedby: "Netherlands (EU); Mistral AI (France) by default", competitor: "France (EU) — sovereign cloud framework, per Eurosign" },
  { label: "Audit trail, ESIGN/UETA/eIDAS compliance", signedby: "Included", competitor: "Included, eIDAS-compliant" },
  { label: "Templates and bulk send", signedby: "Templates on Pro+, bulk send on Team+", competitor: "Grouped recipients and attachment options included; templates not listed as a standard feature" },
  { label: "API access + outbound webhooks", signedby: "Included in Business ($29/mo) — multi-signer create, list/void, signed-file download, webhooks", competitor: "Separate API pricing, bundled into the Custom Plan for 4+ users — contact sales for a quote" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Eurosign</span>
      </div>
      {rows.map((r) => (
        // Stacked cards below sm: the 3-column grid gives each cell only
        // ~1/3 of a mobile screen's width, which forces long unbreakable
        // strings (e.g. "3 documents/month") to overflow the cell and get
        // clipped by this table's overflow-hidden border. Full-width rows
        // sidestep that instead of trying to hyphenate/break-word around it.
        <div key={r.label} className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-3 text-sm sm:grid-cols-3 sm:items-start sm:gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal sm:text-slate-600">
            {r.label}
          </span>
          <span className="font-medium text-slate-900">
            <span className="text-slate-400 sm:hidden">SignedBy — </span>
            {r.signedby}
          </span>
          <span className="text-slate-500">
            <span className="text-slate-400 sm:hidden">Eurosign — </span>
            {r.competitor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VsEurosignPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Eurosign</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Eurosign prices per user and per envelope, and its free trial requires booking a demo call. SignedBy is a
          flat $7/mo, self-serve from the first click, with AI-assisted drafting and field placement Eurosign
          doesn&apos;t offer.
        </p>
        <CtaLink href={SIGNUP_HREF} color={ctaColor} page="vs-eurosign" position="hero">
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
          Pricing and feature details as of August 2026, based on Eurosign&apos;s publicly listed plans — always
          confirm current rates directly with Eurosign, since providers change plans without notice. Eurosign is a
          trademark of its respective owner; SignedBy is not affiliated with or endorsed by Eurosign.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="vs-eurosign" position="footer">
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
          <Link href="/vs/hix" className="hover:text-slate-600">
            SignedBy vs Hix
          </Link>
          <Link href="/vs/bolosign" className="hover:text-slate-600">
            SignedBy vs BoloSign
          </Link>
          <Link href="/vs/adobe" className="hover:text-slate-600">
            SignedBy vs Adobe
          </Link>
          <Link href="/vs/dropbox" className="hover:text-slate-600">
            SignedBy vs Dropbox Sign
          </Link>
          <Link href="/vs/swisssign" className="hover:text-slate-600">
            SignedBy vs SwissSign
          </Link>
          <Link href="/vs/documenso" className="hover:text-slate-600">
            SignedBy vs Documenso
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
