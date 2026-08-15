import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Documenso — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Documenso on price, AI-assisted drafting, and open source/self-hosting. Flat $7/mo unlimited plan vs Documenso's $25+/mo hosted tiers or self-hosted Community/Business editions.";

// A page that sets its own metadata.openGraph/twitter -- even without an
// images field -- stops Next.js from auto-inheriting the root layout's
// opengraph-image.tsx (unlike a page with no metadata override at all,
// e.g. the homepage, which gets it for free). So every page overriding
// title/description here has to explicitly point back at it, or it gets
// no preview image at all -- see src/app/vs/signnow/page.tsx for the
// original discovery of this gotcha.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/documenso" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/documenso", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const SIGNUP_HREF = "/login?intent=signup&utm_source=vs_documenso&utm_medium=cta&utm_campaign=vs_documenso_page";

type Row = { label: string; signedby: string; competitor: string };

// Figures pulled directly from documenso.com/pricing and documenso.com,
// 2026-08-12 -- see PRICING_ROWS/FEATURE_ROWS footnote. SignedBy's own
// figures from src/lib/currency.ts (USD table) and src/components/
// pricing-cards.tsx, same date.
const PRICING_ROWS: Row[] = [
  { label: "Free tier", signedby: "3 documents/mo + 3 Verified Badge seals/mo, no card required", competitor: "5 documents/mo, up to 10 recipients/doc, no card required" },
  { label: "Cheapest unlimited paid plan", signedby: "$7/mo flat (Pro) — unlimited documents, 1 user", competitor: "$25/mo (Individual), $300/yr billed yearly — unlimited documents, 1 user" },
  { label: "Multi-user tier", signedby: "$14/mo total, up to 3 users (Team)", competitor: "$40/mo, 5 users included then $8/user, $480/yr billed yearly (Teams)" },
  { label: "API access", signedby: "Included from $7/mo (Pro); full REST API + webhooks on Business ($29/mo)", competitor: "Personal-use API on Individual ($25/mo); automation API on Teams ($40/mo); unlimited API only on Platform ($250/mo)" },
  { label: "Highest published self-serve tier", signedby: "$29/mo (Business) — up to 5 users, unlimited API + webhooks, custom branding", competitor: "$250/mo (Platform) — unlimited users, unlimited API, whitelabel embed" },
  { label: "Self-hosting", signedby: "Not offered — hosted SaaS only", competitor: "Community Edition (AGPL, free, self-hosted) or licensed Business Edition — run on your own infrastructure" },
];

const FEATURE_ROWS: Row[] = [
  { label: "Open source / self-hostable", signedby: "Not offered — closed-source hosted SaaS", competitor: "Yes — AGPL-licensed Community Edition on GitHub (documenso/documenso), plus a licensed self-hosted Business Edition" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not offered — fields (signature, text, date) placed manually" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Embedded signing widget for your own app", signedby: "Not offered as a packaged white-label widget", competitor: "Included from Teams ($40/mo); white-label embed on Platform ($250/mo)" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not offered as a public page" },
  { label: "Per-page signer engagement tracking (dwell time)", signedby: "Included (Pro+)", competitor: "Not offered" },
  { label: "Compliance standards named", signedby: "ESIGN Act, UETA, eIDAS audit trail, included on every plan", competitor: "ESIGN Act, UETA, eIDAS, 21 CFR Part 11, SOC 2 and HIPAA referenced on their compliance page" },
  { label: "Company / hosted-plan data region", signedby: "Netherlands (EU) company; Mistral AI (France) by default for AI features", competitor: "Documenso, Inc. (per their site footer) — hosted-plan data region isn't published; self-hosting lets you pick your own" },
  { label: "Templates and bulk send", signedby: "Templates on Pro+, bulk send on Team+", competitor: "Templates with reusable Direct Link sharing included; bulk-send not listed as a standard feature" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Documenso</span>
      </div>
      {rows.map((r) => (
        // Stacked cards below sm -- see src/app/vs/eurosign/page.tsx's
        // matching comment for why (long unbreakable strings overflow a
        // 1/3-width mobile cell inside this table's overflow-hidden border).
        <div key={r.label} className="grid grid-cols-1 gap-1.5 border-t border-slate-100 px-4 py-3 text-sm sm:grid-cols-3 sm:items-start sm:gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal sm:text-slate-600">
            {r.label}
          </span>
          <span className="font-medium text-slate-900">
            <span className="text-slate-400 sm:hidden">SignedBy — </span>
            {r.signedby}
          </span>
          <span className="text-slate-500">
            <span className="text-slate-400 sm:hidden">Documenso — </span>
            {r.competitor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VsDocumensoPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Documenso</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Documenso is open source and self-hostable, with a $25+/mo hosted tier and a developer-first API. SignedBy
          is a flat $7/mo hosted plan with AI-assisted drafting, quoting, and field placement Documenso doesn&apos;t
          offer — different priorities, compared honestly below.
        </p>
        <CtaLink href={SIGNUP_HREF} color={ctaColor} page="vs-documenso" position="hero">
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
          Pricing and feature details as of August 2026, based on Documenso&apos;s publicly listed plans and
          documenso.com — always confirm current rates directly with Documenso, since providers change plans without
          notice. If you need to run your own infrastructure or want full source-code access, Documenso&apos;s
          self-hosted Community Edition is worth a look; SignedBy doesn&apos;t offer a self-hosted option. Documenso
          is a trademark of Documenso, Inc.; SignedBy is not affiliated with or endorsed by Documenso.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="vs-documenso" position="footer">
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
          <Link href="/vs/eurosign" className="hover:text-slate-600">
            SignedBy vs Eurosign
          </Link>
          <Link href="/vs/swisssign" className="hover:text-slate-600">
            SignedBy vs SwissSign
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
