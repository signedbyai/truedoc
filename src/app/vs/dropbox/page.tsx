import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Dropbox Sign — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Dropbox Sign: flat $7/mo unlimited documents with built-in AI drafting and quoting vs Dropbox Sign's per-user app plans and a completely separate, volume-priced API product.";

// See the note on /vs/signnow: a page overriding metadata must point back at
// the shared opengraph image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/dropbox" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/dropbox", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

// utm_* added 2026-08-01 (see [[signup-attribution]]) — previously untagged.
const SIGNUP_HREF = "/login?intent=signup&utm_source=vs_dropbox&utm_medium=cta&utm_campaign=vs_dropbox_page";

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat, unlimited documents", competitor: "$15/mo (Essentials, 1 user, billed monthly) — unlimited signature requests, but API access is a separate paid product" },
  { label: "Free plan limits", signedby: "3 documents/month", competitor: "3 signature requests/month (unlimited self-signing doesn't count against it)" },
  { label: "Realistic team-ready tier", signedby: "$14/mo total (Team, up to 3 users)", competitor: "Standard, $25/user/mo — 3 users ≈ $75/mo" },
  { label: "Pricing model", signedby: "Flat fee, real unlimited documents on paid plans, no per-seat math", competitor: "Per-user across 3 app tiers (Essentials/Standard/Premium), plus a completely separate API product priced by monthly signature-request volume — from $75/mo for 50 requests, $250/mo for 100" },
];

const FEATURE_ROWS: Row[] = [
  { label: "No-login email signing for recipients", signedby: "Yes — single-use link, sign in the browser", competitor: "Yes — recipients sign via an emailed link, no Dropbox account needed" },
  { label: "Get started without a sales call", signedby: "Yes — sign up and send in minutes", competitor: "App plans are self-serve up to 5 users; Premium tier, SSO, and data residency require contacting sales" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Not advertised as an AI feature — fields are placed manually with drag-and-drop" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Per-page signer engagement tracking (dwell time)", signedby: "Included (Pro+)", competitor: "Not advertised — performance dashboards are account-level and Premium-only" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not offered — a non-editable audit trail is attached to each signature request instead" },
  { label: "Bulk send", signedby: "Team+ ($14/mo)", competitor: "Standard+ ($25/user/mo)" },
  { label: "API access + outbound webhooks", signedby: "Included in Business ($29/mo), self-serve — multi-signer create, list/void, signed-file download, webhooks", competitor: "A separate product line entirely (\"Dropbox Sign API\"), priced by monthly signature-request volume regardless of which app plan you're on — from $75/mo (50 requests) to $250/mo (100 requests), custom above that" },
  { label: "Native CRM integrations", signedby: "Not offered — REST API only (Business)", competitor: "Google Drive, Microsoft Word, and HubSpot on Essentials+; Salesforce and more added on Standard/Premium" },
  { label: "Security certifications", signedby: "ESIGN/UETA + GDPR; EU hosting, open DPA/sub-processor list", competitor: "SOC 2 Type II, ISO 27001, eIDAS, GDPR; HIPAA-ready with a signed BAA on qualifying plans" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Dropbox Sign</span>
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
            <span className="text-slate-400 sm:hidden">Dropbox Sign — </span>
            {r.competitor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VsDropboxPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Dropbox Sign</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Dropbox Sign&apos;s app plans are reasonably priced per user — but the moment you need API access, it stops
          being an upgrade tier and becomes an entirely separate product, priced by monthly signature-request volume
          on top of whatever you&apos;re already paying. SignedBy is one flat $7/mo with genuinely unlimited
          documents, and a self-serve API included in a single higher plan rather than sold separately.
        </p>
        <CtaLink href={SIGNUP_HREF} color={ctaColor} page="vs-dropbox" position="hero">
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
              You want a straightforward send-and-sign tool at one flat, published price — with AI drafting and
              quoting built in, and a real API included in a plan you can just buy, not a separate volume-priced
              product.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose Dropbox Sign if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You&apos;re already in the Dropbox ecosystem, only need the app (not the API), and per-user pricing
              works fine for your team size.
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
          Details as of August 2026, based on Dropbox Sign&apos;s public USD pricing for its app plans (Essentials/
          Standard/Premium) and separately-priced API product (sign.dropbox.com). Premium and API-Premium use
          custom, sales-led pricing not listed publicly — always confirm current plans and pricing directly with
          Dropbox Sign, since providers change plans without notice. Dropbox and Dropbox Sign are trademarks of
          Dropbox, Inc.; SignedBy is not affiliated with or endorsed by Dropbox.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="vs-dropbox" position="footer">
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
