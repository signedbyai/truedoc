import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { FlagValues } from "flags/react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag, verifiedBadgeInvoiceCtaFlag, type VerifiedBadgeInvoiceCtaVariant } from "@/flags";

// Companion page to /verified-badge (2026-08-06, direct ask, after the
// invoice hero image and the invoice-fraud ad angle both got built against
// what was still the AI-detector-framed page). Same product, same signup
// flow, different fear: /verified-badge is "prove a client's AI detector
// is wrong about my work"; this page is "prove a scammer didn't fake my
// invoice." Forcing both pitches onto one page/hero was the actual bug —
// see [[verified-badge-invoice-fraud-campaign-assets]] and
// [[verified-badge-reddit-campaign-assets]] for the two ad angles this
// pairs with.
//
// Same two honesty rules as the invoice-fraud ad copy, non-negotiable:
// never claim this "stops fraud" or guarantees a scam can't happen — it
// proves a specific file existed, unaltered, as of a verified timestamp,
// sealed by an identity-verified person; and don't overstate what
// AI-generated fake invoices are doing today.
const TITLE = "Verified Badge — prove your invoice is genuinely from you, not an AI fake | SignedBy";
const DESCRIPTION =
  "Seal your invoice as unaltered and identity-verified before you send it. Your client scans a code and knows instantly it's really from you. Free to start, no card required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Same dashboard-native flow as /verified-badge's START_HREF (see that
// file's comment for the full history) — utm_campaign changed so this
// page's own signups are attributable separately from /verified-badge's,
// same reasoning as [[signup-attribution]].
const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge&utm_medium=cta&utm_campaign=verified_badge_invoice_page";

// Mostly the same FAQ as /verified-badge — only the first question is
// reframed for the invoice-fraud angle specifically; the rest (client
// view, identity-check freshness, PDF-only, plan/pricing, TSA proof) are
// the same real facts regardless of which fear brought someone here.
const FAQ = [
  {
    q: "Does this stop someone from faking my invoice?",
    a: "No — and it doesn't claim to. A Verified Badge proves your real invoice existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified person. That gives your client an actual way to check instead of just trusting that an email looks right — it isn't a guarantee nothing bad can ever happen.",
  },
  {
    q: "What does the client actually see?",
    a: "A badge on your invoice — a QR code, the SignedBy mark, and a short verification link as plain text, so it reads as legitimate even printed or screenshotted. Scanning or visiting it lands on a public ledger page: your name, when the file was sealed, and confirmation it hasn't been altered since. No account or login needed to check it.",
  },
  {
    q: "What if my identity check is old?",
    a: "Your first seal verifies your identity via a government-ID check (about a minute, hosted by Stripe). Later seals reuse that same verified check rather than re-scanning your ID every time — cheaper and faster. The ledger page always shows \"identity verified on [date]\" alongside \"sealed on [date]\" as two separate facts, so it's clear if the identity check itself is from earlier than this specific seal.",
  },
  {
    q: "Does this work for non-PDF files?",
    a: "PDFs only for now. If your invoice comes from accounting software as something else, export or print it to a PDF first, then seal that.",
  },
  {
    q: "What plan do I need?",
    a: "Any plan, including Free, no card required. Free includes 3 Verified Badge seals a month. Pro plan or higher gets unlimited sealing, no per-seal charge. Seal a file right from your dashboard's New Document menu — developers can also do this from Console chat or the API, see the developer docs.",
  },
  {
    q: "What actually makes the timestamp \"cryptographically verified\"?",
    a: "Every seal is submitted to a real Time Stamping Authority (Sectigo's public RFC 3161 service, with FreeTSA as an automatic fallback if Sectigo can't be reached) that signs the file's hash together with the time. That's independently verifiable by anyone, trusting only the TSA — not just a date in SignedBy's own database. The ledger page at signedby.ai/verify shows which TSA backed a given seal.",
  },
];

// Pill + CTA button + bottom-section heading copy for the
// verified-badge-invoice-cta test (2026-08-09, direct ask, see src/flags.ts
// and marketing/verified-badge-invoice-cta-test.md). A is the pre-test copy,
// kept verbatim as the control. `heading` drives the "Generate Your Proof"
// h2 above the bottom CTA — added 2026-08-09 so that section reads as one
// consistent pitch with the top pill instead of staying static across
// variants. C's button was changed from "Get Your Verified Badge" to
// "Verify Your Invoice for Free" the same day — the "Make a..." pill already
// risks implying SignedBy generates invoices; keeping "Get Your Verified
// Badge" as the button would've repeated that ambiguity right at the click,
// so the button deliberately uses "Verify" instead of "Make/Get" to pull
// C's framing back toward what the product actually does.
//
// D/E/F added 2026-08-09, direct ask — copy pulled from attached hero-section
// concept mockups (reference images only, not pages that exist in this app).
// Kept to this same pill/heading/button structure and the existing green
// pill's visual styling deliberately, rather than also adopting the
// mockups' different visual treatment (wax-seal badge art, 3-step section,
// etc.) — that's a materially bigger redesign than this lightweight copy
// test is set up to run cleanly, and mixing visual + copy changes per
// variant would make a winner's cause unreadable (which one drove it?).
// Flagged, not silently built — if the visual redesign is wanted too, worth
// scoping as its own follow-up rather than folding into this flag.
const CTA_COPY: Record<VerifiedBadgeInvoiceCtaVariant, { pill: string; button: string; heading: string }> = {
  A: {
    pill: "Secure Your Invoice for Free – Verified & Tamper-Evident",
    button: "Get Your Verified Badge Now →",
    heading: "Secure Your Invoice for Free",
  },
  B: {
    pill: "Secure Your Invoice Now",
    button: "Get Your Verified Badge →",
    heading: "Secure Your Invoice Now",
  },
  C: {
    pill: "Make a Verified Invoice for Free",
    button: "Verify Your Invoice for Free →",
    heading: "Make a Verified Invoice for Free",
  },
  D: {
    pill: "Protect Your Invoices and Get Paid",
    button: "Secure Your First Invoice Now →",
    heading: "Protect Your Invoices and Get Paid",
  },
  E: {
    pill: "Seal in Seconds. Protect Always.",
    button: "Start Sealing →",
    heading: "Seal in Seconds. Protect Always.",
  },
  F: {
    pill: "Client Trust, Instantly Verified",
    button: "Seal Your Invoices Now →",
    heading: "Client Trust, Instantly Verified",
  },
};

// Full visual redesign for D/E/F (2026-08-09, direct ask — follow-up to the
// copy-only D/E/F above: "I'd like D, E and F to have also the full visual
// redesign"). A/B/C keep the original page untouched; D/E/F get their own
// headline (this map), a wax-seal medallion (public/verified-seal-badge.png,
// see scripts/generate-verified-seal-badge.mjs) in place of/alongside the
// small green tick, a visual 3-step section, and a seal-centered closing
// section — all following the attached hero-section concept mockups.
//
// Headlines below are pulled from those same mockups' three named concepts
// (Trust Mark / Workflow / Client View), mapped to the D/E/F copy angle
// each already carries. The existing honest subtext paragraph underneath is
// UNCHANGED for all six variants on purpose — it's the one sentence in this
// page carrying the "doesn't stop fraud, proves provenance" disclaimer this
// project treats as non-negotiable, so it wasn't swapped out just because
// the reference mockups showed shorter alternative subtext.
const REDESIGN_HEADLINES: Record<"D" | "E" | "F", string> = {
  D: "Your Clients Deserve Proof. Seal Invoices. Protect Your Payments.",
  E: "Seal in Seconds. Protect Always.",
  F: "Make It Clear to Your Clients. Proof for Them. Peace for You.",
};
const REDESIGN_VARIANTS: readonly VerifiedBadgeInvoiceCtaVariant[] = ["D", "E", "F"];

// Small stylized invoice card used in the D/E/F "3-step" section below —
// deliberately built as real markup (not a generated PNG like the main
// hero) so the text stays crisp at any size and this stays cheap to tweak.
function MiniInvoiceCard({ sealed }: { sealed?: boolean }) {
  return (
    <div className="relative w-28 shrink-0 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm sm:w-32">
      <p className="text-[10px] font-semibold text-slate-900">Invoice</p>
      <p className="text-[8px] text-slate-400">INV-0148</p>
      <div className="mt-2 space-y-1">
        <div className="h-1 w-full rounded bg-slate-100" />
        <div className="h-1 w-3/4 rounded bg-slate-100" />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1">
        <span className="text-[8px] font-semibold text-slate-700">Total</span>
        <span className="text-[8px] font-semibold text-slate-700">€3,050</span>
      </div>
      {sealed && (
        <div className="absolute -right-3 -top-3 h-9 w-9">
          <Image src="/verified-seal-badge.png" alt="" width={320} height={320} className="h-full w-full" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default async function VerifiedBadgeInvoicesPage() {
  const ctaColor = await ctaColorFlag();
  const ctaVariant = await verifiedBadgeInvoiceCtaFlag();
  const { pill: pillCopy, button: buttonCopy, heading: headingCopy } = CTA_COPY[ctaVariant];
  const isRedesign = REDESIGN_VARIANTS.includes(ctaVariant);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor, "verified-badge-invoice-cta": ctaVariant }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {isRedesign ? REDESIGN_HEADLINES[ctaVariant as "D" | "E" | "F"] : "AI can fake an invoice in seconds. Prove yours is genuinely you."}{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          A scammer can now knock up a convincing fake invoice with your name and branding on it in seconds, and
          send it to one of your clients. Seal your real invoice first: a hash and identity-verified proof of what
          you actually sent, so your client can check before they pay.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {pillCopy}
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color={ctaColor} page="verified-badge-invoices" position="hero" variant={ctaVariant}>
            {buttonCopy}
          </CtaLink>
          <p className="text-xs text-slate-400">Free to start, no card required — takes about a minute to set up.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        {/* The in-context invoice mockup — this is the page it was actually
            built for. See hero-verified-badge-invoice.png's own generation
            comment (generate-hero-mockup.tsx) for the QR-target gotcha
            already fixed once here. */}
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="A Verified Badge stamped in the corner of a freelance invoice — the SignedBy mark, a scannable QR code, and a verification link"
              width={640}
              height={820}
              priority
              sizes="(max-width: 640px) 90vw, 384px"
              className="h-auto w-full"
            />
          </div>
          {/* D/E/F visual redesign (2026-08-09, direct ask): the wax-seal
              medallion overlapping the card's corner, matching the
              reference mockups' "seal stamped on the invoice" look — layered
              on top of the existing hero PNG rather than baked into a new
              one, so the shared hero-verified-badge-invoice.png (also used
              by the pitch deck) doesn't need touching. */}
          {isRedesign && (
            <div className="absolute -bottom-7 -right-5 h-28 w-28 drop-shadow-md sm:h-32 sm:w-32">
              <Image
                src="/verified-seal-badge.png"
                alt="A wax-seal style verified and sealed badge with a scannable QR code"
                width={320}
                height={320}
                className="h-full w-full"
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        {isRedesign ? (
          <>
            {/* Visual 3-step section for D/E/F, following the reference
                mockups' "Protect Your Invoices and Get Paid" layout —
                before/after mini invoice cards instead of a plain text
                list. Step labels are the mockups' own simpler wording,
                deliberately different from A/B/C's more detailed 3-item
                list below (that one stays as-is for the classic layout). */}
            <h2 className="text-center text-lg font-semibold text-slate-900">Protect Your Invoices and Get Paid</h2>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-500 sm:text-sm">
              <div>Step 1: Create Invoice</div>
              <div>Step 2: Seal it (with Badge)</div>
              <div>Step 3: Send Securely</div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <MiniInvoiceCard />
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
              <MiniInvoiceCard sealed />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-slate-500">Verified. Trusted. Paid.</p>
            <div className="mt-4 flex justify-center">
              <CtaLink href={START_HREF} color={ctaColor} page="verified-badge-invoices" position="steps" variant={ctaVariant}>
                {buttonCopy}
              </CtaLink>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "1. Verify once",
                  body: "A one-time government-ID check (about a minute, hosted by Stripe). Reused across every future seal — no re-scanning your ID each time.",
                },
                {
                  step: "2. Seal the invoice",
                  body: "Just upload your finished invoice PDF from your dashboard — SignedBy hashes it, timestamps it, and generates your badge.",
                },
                {
                  step: "3. Embed the badge",
                  body: "Drop the badge on your invoice before you send it. A client scans it and lands on a public ledger page — no account needed.",
                },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{s.step}</p>
                  <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Same card treatment as /boat-jet-ski-rental's own link to its
            guide (2026-08-08, direct ask: build a guide for this page "similar
            to what we did on /boat-jet-ski-rental/guide"). */}
        <Link
          href="/verified-badge-invoices/guide"
          className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
        >
          <h3 className="text-base font-semibold text-slate-900">New to SignedBy? Read the sealing & sending guide</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Step by step: verify your identity once, and exactly what happens every time you seal and send an
            invoice after that.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Read the guide →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">What this actually proves</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          A Verified Badge is a provenance and integrity proof, not a fraud-detection tool. It confirms this exact
          file existed, unaltered, as of a cryptographically verified timestamp, sealed by an identity-verified
          person — a real, useful, different claim from &ldquo;this looks legitimate.&rdquo; Honest framing, on
          purpose: overclaiming here would undercut the one thing that actually holds up under scrutiny.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        {/* D/E/F closing section, following the reference mockups' "Client
            Trust, Instantly Verified" treatment — big centered medallion
            above the same headingCopy/buttonCopy every variant already
            uses, so this is a visual-only change layered onto the existing
            variant-driven copy, not a new copy path. */}
        {isRedesign && (
          <div className="mx-auto mb-6 h-32 w-32 sm:h-36 sm:w-36">
            <Image
              src="/verified-seal-badge.png"
              alt="A wax-seal style verified and sealed badge with a scannable QR code"
              width={320}
              height={320}
              className="h-full w-full"
            />
          </div>
        )}
        <h2 className="text-2xl font-semibold text-slate-900">{headingCopy}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Free to start — 3 seals a month included, no card required. Need more? Pro plan or higher gets unlimited
          sealing, no per-seal charge.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color={ctaColor} page="verified-badge-invoices" position="footer" variant={ctaVariant}>
          {buttonCopy}
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
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Verify a document
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            API &amp; MCP docs
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verified-badge-invoices/guide" className="hover:text-slate-600">
            Sealing &amp; sending guide
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
