import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Adobe Acrobat Sign — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Adobe Acrobat Sign: flat $7/mo unlimited documents with built-in AI drafting and quoting vs Adobe's PDF-editing-bundled Acrobat plans and sales-led Sign Solutions for API access.";

// See the note on /vs/signnow: a page overriding metadata must point back at
// the shared opengraph image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/adobe" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/adobe", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat, unlimited documents", competitor: "$14.99/mo (Acrobat Standard, individual, annual billed monthly) — e-signing bundled with PDF editing, not sold on its own" },
  { label: "Free plan limits", signedby: "3 documents/month", competitor: "No self-serve free plan for sending — free Acrobat Reader only lets you view/sign as a recipient" },
  { label: "Realistic team-ready tier", signedby: "$14/mo total (Team, up to 3 users)", competitor: "Acrobat Standard for teams, $16.99/user/mo — 3 users ≈ $51/mo" },
  { label: "Pricing model", signedby: "Flat fee, real unlimited documents on paid plans, no per-seat math", competitor: "Per-person (individual) or per-license (teams) across 3 bundled tiers — Standard/Pro/Studio — plus a separate sales-led \"Acrobat Sign Solutions\" for API/enterprise needs, custom quote only" },
];

const FEATURE_ROWS: Row[] = [
  { label: "No-login email signing for recipients", signedby: "Yes — single-use link, sign in the browser", competitor: "Yes — recipients sign via an emailed link, no Adobe account required" },
  { label: "Get started without a sales call", signedby: "Yes — sign up and send in minutes", competitor: "Individual/team Acrobat plans are self-serve; API access, advanced authentication, and enterprise governance require contacting Adobe sales for Acrobat Sign Solutions" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered — Acrobat AI Assistant (Studio tier, $24.99+/mo) chats with and summarizes an existing PDF, it doesn't generate a new document from a description" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not advertised as an AI feature — fields are placed manually or via saved form templates" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Per-page signer engagement tracking (dwell time)", signedby: "Included (Pro+)", competitor: "Agreement-level status tracking (sent/viewed/signed); no per-page dwell-time feature advertised" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not offered — an audit trail and certificate of completion are embedded in the signed PDF instead" },
  { label: "Bulk send", signedby: "Team+ ($14/mo)", competitor: "Included from Acrobat Pro up (\"Send in Bulk\"/MegaSign) — $19.99/mo individual or $23.99/user/mo for teams" },
  { label: "API access + outbound webhooks", signedby: "Included in Business ($29/mo), self-serve — multi-signer create, list/void, signed-file download, webhooks", competitor: "Only through the sales-led Acrobat Sign Solutions path, custom pricing — not available on any self-serve Acrobat plan" },
  { label: "Native CRM integrations", signedby: "Not offered — REST API only (Business)", competitor: "Available (Microsoft 365, Salesforce, Workday, and more), mainly through Acrobat Sign Solutions/enterprise integrations" },
  { label: "Security certifications", signedby: "ESIGN/UETA + GDPR; EU hosting, open DPA/sub-processor list", competitor: "ISO 27001:2013, SOC 2 Type II, FedRAMP Tailored, PCI DSS; GDPR-ready; HIPAA-ready with a signed BAA on qualifying plans" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Adobe Acrobat Sign</span>
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
            <span className="text-slate-400 sm:hidden">Adobe — </span>
            {r.competitor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VsAdobePage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Adobe Acrobat Sign</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Adobe doesn&apos;t sell e-signing on its own — it&apos;s bundled into an Acrobat PDF-editing plan, and split
          across three confusingly-named tiers (Standard, Pro, Studio) before API access and integrations push you
          into a separate, sales-led &quot;Acrobat Sign Solutions&quot; quote. SignedBy is one flat $7/mo with
          genuinely unlimited documents, AI drafting, and AI quoting built in from day one.
        </p>
        <CtaLink href="/login?intent=signup" color={ctaColor} page="vs-adobe" position="hero">
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
              You just need to send documents for signature — one flat, published price, no PDF-editing suite to pay
              for along the way, and AI drafting/quoting built in rather than a separate add-on tier.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose Adobe Acrobat Sign if…</p>
            <p className="mt-2 text-sm text-slate-600">
              Your team already lives in Acrobat for PDF editing, or you need Adobe&apos;s enterprise-grade
              compliance stack (FedRAMP, PCI DSS, HIPAA BAAs) and are ready for a sales-led setup to get there.
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
          Details as of August 2026, based on Adobe&apos;s public USD pricing for Acrobat individual/team plans and
          Adobe&apos;s published Acrobat Sign trust/compliance documentation. Acrobat Sign Solutions (API, advanced
          authentication, enterprise governance) use custom, sales-led pricing not listed publicly — always confirm
          current plans and pricing directly with Adobe, since providers change plans without notice. Adobe, Acrobat,
          and Acrobat Sign are trademarks of Adobe Inc.; SignedBy is not affiliated with or endorsed by Adobe.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href="/login?intent=signup" className="mt-5" color={ctaColor} page="vs-adobe" position="footer">
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
          <Link href="/vs/dropbox" className="hover:text-slate-600">
            SignedBy vs Dropbox Sign
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
