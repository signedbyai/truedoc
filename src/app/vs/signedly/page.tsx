import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy vs Signedly — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to Signedly: flat $7/mo unlimited documents with built-in AI drafting and quoting vs Signedly's per-document free tier, LTV-enabled signatures, and per-user Enterprise pricing.";

// See the note on /vs/signnow: a page overriding metadata must point back at
// the shared opengraph image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/signedly" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/signedly", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

// utm_* added 2026-08-01 (see [[signup-attribution]]) — previously untagged.
const SIGNUP_HREF = "/login?intent=signup&utm_source=vs_signedly&utm_medium=cta&utm_campaign=vs_signedly_page";

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat, unlimited documents", competitor: "$9/mo (Personal Pro) — 50 documents/mo, 5 templates, 1 workflow" },
  { label: "Free plan limits", signedby: "3 documents/month, 3 Verified Badge seals/month, 1 saved template", competitor: "2 documents/month" },
  { label: "Realistic team-ready tier", signedby: "$14/mo total (Team, up to 3 users)", competitor: "$29/user/month (Enterprise) — the only tier with team management, so a 3-person team runs $87/mo" },
  { label: "Pricing model", signedby: "Flat fee per workspace, real unlimited documents on paid plans, no per-seat math", competitor: "Per-document/template caps on Personal Pro and Business Pro, then per-user on Enterprise — the only tier either plan adds team seats" },
];

const FEATURE_ROWS: Row[] = [
  { label: "No-login email signing for recipients", signedby: "Yes — single-use link, sign in the browser", competitor: "Yes — sign & send or send & get signed, mobile signatures supported" },
  { label: "Get started without a sales call", signedby: "Yes — sign up and send in minutes", competitor: "Yes — no credit card on Free; paid tiers self-serve with a 14-day free trial" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Pro+)", competitor: "Not offered — no AI features listed on their site" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Signature proof longevity / “LTV”", signedby: "Every signed document is timestamp-sealed (provable until 2037-06-24 as of today) — and we published our own research on why a one-time archive timestamp doesn't actually solve proof expiry, ours included", competitor: "“LTV Enabled Digital Signatures” listed on every plan including Free — mechanism and re-timestamping cadence not published" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed — SHA-512 fingerprint", competitor: "Not advertised" },
  { label: "National ID-based signing (e.g. Aadhaar)", signedby: "Not offered", competitor: "Aadhaar e-signing — a real differentiator for India-market use cases" },
  { label: "Bulk send", signedby: "Team+ ($14/mo)", competitor: "Enterprise only ($29/user/month)" },
  { label: "API access", signedby: "Included from Pro ($7/mo); full access + webhooks on Business ($29/mo)", competitor: "Enterprise only ($29/user/month)" },
  { label: "Security certifications", signedby: "ESIGN/UETA + GDPR; EU hosting, open DPA/sub-processor list", competitor: "Not stated on their site — no SOC 2, ISO, or HIPAA claims published" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="hidden grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>Signedly</span>
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
            <span className="text-slate-400 sm:hidden">Signedly — </span>
            {r.competitor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VsSignedlyPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs Signedly</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Both start free. The difference is what that free tier gets you and how the paid tiers scale: SignedBy is
          one flat $7/mo with genuinely unlimited documents and built-in AI drafting and quoting. Signedly&apos;s Free
          plan caps out at 2 documents/month, its paid tiers are metered by document/template count up to Business
          Pro, and team features only exist on its per-user Enterprise plan.
        </p>
        <CtaLink href={SIGNUP_HREF} color={ctaColor} page="vs-signedly" position="hero">
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
              You want a flat, published price with real unlimited documents on every paid tier, AI drafting and
              quoting built in, and team pricing that doesn&apos;t multiply by headcount.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose Signedly if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You need Aadhaar-based identity signing for an India-market workflow, or you want deep workflow/template
              tooling at low volume and don&apos;t mind Enterprise&apos;s per-user pricing once you need a team.
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
        {/* The LTV row links out to our own research post rather than just
            asserting a claim (2026-08-22, direct ask — Signedly markets
            "LTV Enabled Digital Signatures" starting on its Free plan). We
            do timestamp-seal documents too; the honest comparison isn't
            "they have it, we don't" but that a single archive timestamp
            — on either platform — doesn't structurally solve proof
            expiry the way the label implies. See
            /research/signed-pdf-proof-expiry for the full finding. */}
        <p className="mt-4 text-sm text-slate-600">
          On the “LTV” row above: we tested this claim against our own product first, not just Signedly&apos;s.{" "}
          <Link href="/research/signed-pdf-proof-expiry" className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">
            Read why a one-time long-term-validation timestamp doesn&apos;t do what it sounds like it does →
          </Link>
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Details as of August 2026, based on Signedly&apos;s public pricing and features pages (signedly.com/pricing,
          signedly.com). Always confirm current limits and plan requirements directly with Signedly, since providers
          change plans without notice. Signedly is a product of Saaswiz Softtech Private Ltd; SignedBy is not
          affiliated with or endorsed by Signedly.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="vs-signedly" position="footer">
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
