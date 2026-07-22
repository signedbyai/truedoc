import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const TITLE = "SignedBy vs BoloSign — pricing and feature comparison";
const DESCRIPTION =
  "How SignedBy compares to BoloSign: flat $7/mo unlimited documents with built-in AI drafting and quoting vs BoloSign's signature-credit tiers, form-building tools, and CRM integrations.";

// See the note on /vs/signnow: a page overriding metadata must point back at
// the shared opengraph image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/bolosign" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/vs/bolosign", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

type Row = { label: string; signedby: string; competitor: string };

const PRICING_ROWS: Row[] = [
  { label: "Cheapest paid plan", signedby: "$7/mo flat, unlimited documents", competitor: "$10/mo (Freelancer, billed annually) — 100 form signatures/mo" },
  { label: "Free plan limits", signedby: "3 documents/month", competitor: "5 form submissions/mo, 2 PDFs/mo" },
  { label: "Realistic team-ready tier", signedby: "$14/mo total (Team, up to 3 users)", competitor: "$49/mo (Team, billed annually) — unlimited members, but 500 form signatures/mo (fair usage applies)" },
  { label: "Pricing model", signedby: "Flat fee, real unlimited documents on paid plans, no per-seat math", competitor: "Tiered by signature/submission volume, not seats — 100 / 500 / \"unlimited\"* credits per tier" },
];

const FEATURE_ROWS: Row[] = [
  { label: "No-login email signing for recipients", signedby: "Yes — single-use link, sign in the browser", competitor: "Yes — shareable link or QR code, no login" },
  { label: "Get started without a sales call", signedby: "Yes — sign up and send in minutes", competitor: "Yes — self-serve signup, 7-day free trial, no card required" },
  { label: "AI-drafted documents from a plain-language description", signedby: "Included (Starter+)", competitor: "Not offered — their AI (\"Map PDF AI\") auto-places fields on a PDF you upload; it doesn't generate a new document from a description" },
  { label: "AI-assisted field placement on upload", signedby: "Included, all plans", competitor: "Included — Map PDF AI auto-detects field type and position, ~95% accuracy on the first pass per their own claims" },
  { label: "AI-drafted quotes from a plain-language description", signedby: "Included, all plans — becomes a signable document instantly", competitor: "Not offered" },
  { label: "Per-page signer engagement tracking (dwell time)", signedby: "Included (Starter+)", competitor: "Form-level analytics on Team+, not per-page dwell time" },
  { label: "Public document-hash verification page", signedby: "Included, no login needed", competitor: "Not advertised — a tamper-proof trust seal on completed contracts instead" },
  { label: "Bulk send", signedby: "Team+ ($14/mo)", competitor: "Team+ ($49/mo)" },
  { label: "API access", signedby: "Business ($29/mo), self-serve", competitor: "\"Custom development using our API\" — listed as Contact Us on every published tier" },
  { label: "Native CRM integrations (HubSpot, Pipedrive, etc.)", signedby: "Not offered — REST API only (Business)", competitor: "Included on Enterprise (HubSpot, Pipedrive, GoHighLevel)" },
  { label: "Security certifications", signedby: "ESIGN/UETA + GDPR; EU hosting, open DPA/sub-processor list", competitor: "SOC 2 Type II, ISO 27001:2022, eIDAS, GDPR, CCPA; HIPAA available as a $49/mo add-on" },
];

function CompareTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{title}</span>
        <span className="text-slate-900">SignedBy</span>
        <span>BoloSign</span>
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

export default function VsBoloSignPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">SignedBy vs BoloSign</h1>
        <p className="max-w-xl text-lg text-slate-600">
          Both are affordable, self-serve alternatives to the big e-signature platforms. The difference is what's
          underneath the price: SignedBy is one flat $7/mo with genuinely unlimited documents and built-in AI
          drafting and quoting. BoloSign is priced in signature/submission credits per tier, built around form
          collection (Google Forms, Sheets, multi-channel delivery) as much as document signing.
        </p>
        <Link href="/login?intent=signup" className={buttonVariants({ variant: "cta", size: "lg" })}>
          Start for free →
        </Link>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Which one is for you?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose SignedBy if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You want a straightforward send-and-sign tool at one flat, published price — with AI drafting and
              quoting built in, and no signature-credit math to track as you grow.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Choose BoloSign if…</p>
            <p className="mt-2 text-sm text-slate-600">
              You want signature collection built into forms — Google Forms/Sheets integration, SMS/WhatsApp
              delivery, and CRM integrations (HubSpot, Pipedrive) matter more to your workflow than a pure
              document-signing flow.
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
          Details as of July 2026, based on BoloSign&apos;s public pricing page (boloforms.com/signature/pricing).
          BoloSign&apos;s Team and Growing Business tiers list several features as &quot;unlimited,&quot; marked with
          a Fair Usage Policy on their site — always confirm current limits and plan requirements directly with
          BoloSign, since providers change plans without notice. BoloSign is a trademark of Closer Innovation Labs
          Corp; SignedBy is not affiliated with or endorsed by BoloSign.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <Link href="/login?intent=signup" className={cn(buttonVariants({ variant: "cta", size: "lg" }), "mt-5")}>
          Start for free →
        </Link>
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
          <Link href="/templates" className="hover:text-slate-600">
            Free templates
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
