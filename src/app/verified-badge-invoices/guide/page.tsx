import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

// Setup/sealing walkthrough for /verified-badge-invoices (2026-08-08,
// direct ask: "similar to what we did on /boat-jet-ski-rental/guide").
// First badge-vertical guide built (vertical-guide-pages-scope memory) --
// same page chrome and GuideStep/generation technique as the boat-rental
// guide, but a completely different underlying flow: no recipient, no
// template, no signing session. It's (1) verify identity once via a
// Stripe-hosted ID check, (2) seal the finished invoice (hash + RFC 3161
// timestamp, badge generated), (3) embed the badge before sending; the
// client scans the QR and lands on a public /verify page. None of the
// boat guide's step content carried over -- see
// scripts/generate-guide-screenshots-verified-badge-invoices.tsx's own
// header comment for the full research trail (new-document-client.tsx's
// Verified Badge tab, the dashboard's post-seal output row, and
// src/app/verify/page.tsx's result card).
//
// Same Part 1 (one-time)/Part 2 (every time) split as the boat guide,
// since the identity check genuinely only happens once and everything
// after that is a 2-click repeat -- that split is real here, not borrowed
// for consistency's sake.
const TITLE = "How to Seal Invoices with a Verified Badge — SignedBy";
const DESCRIPTION =
  "Step-by-step: verify your identity once, then seal and badge every invoice you send after that — what you see, and what your client sees when they scan it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide&utm_medium=cta&utm_campaign=verified_badge_invoice_page";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Open the Verified Badge tab",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Dashboard → New Document → Verified Badge tab. This is a separate track from the Sign tab — there's no recipient to add and nothing to sign, just a file to seal.",
  },
  {
    title: "Choose your invoice PDF",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "PDFs only. If your invoice comes out of accounting software as something else, export or print it to PDF first. Give it a title, then hit Seal this file.",
  },
  {
    title: "Verify your identity (one-time)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Your very first seal needs a government-ID check, hosted by Stripe and usually done in under a minute. Every seal after this one reuses it automatically — you won't see this screen again.",
  },
  {
    title: "You're sealed",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy hashes the file, timestamps it with a real Time Stamping Authority (Sectigo, with EuroTSA and then FreeTSA as automatic fallbacks), and generates your badge — then drops you onto the document's own page.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Seal the next invoice",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Same tab, same two steps — choose the file, hit Seal this file. No identity check this time; that's a one-time cost, not a per-invoice one.",
  },
  {
    title: "Your outputs are ready",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Every seal gives you a Badge image, a Sealed PDF, a Certificate, and a copy/QR of the verify link — all on the document's own page in your dashboard. For an invoice, the Badge image is the one to use: a small mark you drop straight into the file, nothing else to manage.",
  },
  {
    title: "Drop the badge onto your invoice",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Paste the badge image into a corner of your invoice before you send it — same as adding a logo. It carries the QR code, the SignedBy mark, and a short verification link as plain text, so it still reads as legitimate even printed or screenshotted.",
  },
  {
    title: "Your client scans it",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Their camera opens the verify page directly — no app, no account. It confirms two separate facts: the file hasn't changed since it was sealed, and whoever sealed it passed a real identity check. That's a genuine way to check, not just trusting that an email looks right.",
  },
];

export default async function VerifiedBadgeInvoicesGuidePage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">For freelancers & agencies</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Sealing & sending guide</h1>
        <p className="max-w-xl text-base text-slate-600">
          Two parts: verifying your identity once, and what actually happens every time you seal and send an
          invoice after that.
        </p>

        {/* 3-step preview / table of contents (2026-08-09, direct ask) --
            jumps to Part 1 (verify) or Part 2 (seal + send both live there,
            since "send" isn't its own section — it's steps 3-4 of Part 2's
            same step list, not a separate part). Deliberately just a nav
            aid, not a duplicate explanation of the flow — the real detail
            stays in the numbered steps below, avoiding the redundancy a
            fuller workflow-diagram hero would have had here. */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Verify
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Seal
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Send
          </Link>
        </div>

        {/* Reuses the real, live hero from /verified-badge-invoices itself
            (now with the green verified tick, 2026-08-08) rather than
            authoring a separate guide-only hero — this already IS the
            single clearest image of what a sealed invoice looks like. */}
        <Image
          src="/hero-verified-badge-invoice.png"
          alt="A Verified Badge stamped in the corner of a freelance invoice — the SignedBy mark, a scannable QR code with a green verified checkmark, and a verification link"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Back to Verified Badge for Invoices
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Part 1 — Verifying your identity (one time only)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your very first Verified Badge seal includes a one-time identity check. Everything after that is just two
          clicks.
        </p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {SETUP_STEPS.map((step, i) => (
            <div key={step.title} className="px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              </div>
              <Image
                src={step.image}
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className="mx-auto mt-3 w-full rounded-lg border border-slate-200"
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Good to know</h3>
          <p className="mt-2 text-sm text-slate-600">
            The identity check is org-level, not per-document — anyone on your team who seals a document later
            reuses the same verified check once they've done it themselves. Free plan includes 3 Verified Badge
            seals a month; Pro plan or higher gets unlimited sealing, no per-seal charge.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Part 2 — Sealing and sending an invoice, every time</h2>
        <p className="mt-2 text-sm text-slate-600">This is what actually happens once you're verified and it's time to send a real invoice.</p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.title} className="px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              </div>
              <Image
                src={step.image}
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className={`mx-auto mt-3 rounded-lg border border-slate-200 ${step.image.startsWith("/hero-") ? "w-full max-w-xs" : "w-full"}`}
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Good to know</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              A Verified Badge proves your invoice existed, unaltered, as of a cryptographically verified timestamp,
              sealed by an identity-verified person — a real, useful, different claim from &quot;this looks
              legitimate.&quot; It doesn&apos;t stop someone from faking a different invoice, and it doesn&apos;t
              claim to.
            </li>
            <li>
              Prefer to keep the original file completely untouched? Use the Certificate output instead of the badge
              — it files the same proof separately rather than stamping the PDF itself, which is usually the better
              fit for a dataroom than for an invoice you&apos;re handing to one client.
            </li>
            <li>
              You can also seal a file from Console chat or the API instead of the dashboard — see the{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                developer docs
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 Verified Badge seals a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="verified-badge-invoices-guide" position="footer">
          Get Your Verified Badge Now →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge for Invoices
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
