import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepagePreviewG } from "@/components/homepage-preview-g";
import { getRequestCurrency } from "@/lib/currency.server";

// Self-canonical so the homepage is the one indexed URL for the brand — title
// and description are inherited from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// 2026-08-15, direct ask: "push home page variant g to production." Promotes
// what had been the unlinked /home-preview-g route to the real homepage —
// same component (HomepagePreviewG), just without that route's own "Internal
// preview" banner.
//
// Variant G is F with auto-rotating product tabs: they advance every 5s on
// their own, stop permanently once the visitor taps one, pause on
// hover/focus, and don't rotate at all under prefers-reduced-motion. The
// reason for rotation is that with ~92% mobile traffic most visitors never
// tap, so under F three of the four products were effectively never seen.
// See homepage-preview-g-tabs.tsx.
//
// Two things this page adds back that /home-preview-g deliberately did NOT
// have, and which must survive any future variant promotion:
//
//   1. <ReferralCapture />. It is mounted on this page and NOWHERE else in
//      the app — src/components/referral-card.tsx only renders the card.
//      Promoting a preview route verbatim silently drops referral
//      attribution site-wide. It is first in the tree here so it mounts
//      before anything below can redirect.
//   2. Indexable, self-canonical metadata. Every /home-preview-* route
//      carries `robots: { index: false, follow: false }`, which is correct
//      for a preview and catastrophic on "/". This page must never inherit
//      that block.
//
// The outgoing homepage (Tier 1 + developer section, promoted 2026-08-12) is
// snapshotted at /home-archive-2026-08-15 — noindexed, banner-marked, with
// rollback instructions in its own header comment. The same layout also
// remains at /home-preview-b, where it originated.
export default async function LandingPage() {
  // EUR for Eurozone visitors, USD for the rest (from geo/cookie) — same
  // resolution the /pricing page and checkout use, so the figures stay in
  // sync across the whole funnel. See src/lib/currency.ts.
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepagePreviewG currency={currency} />

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/vs/signnow" className="hover:text-slate-600">
            vs SignNow
          </Link>
          <Link href="/vs/docusign" className="hover:text-slate-600">
            vs DocuSign
          </Link>
          <Link href="/vs/pandadoc" className="hover:text-slate-600">
            vs PandaDoc
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Free templates
          </Link>
          <Link href="/developers" className="hover:text-slate-600">
            API docs
          </Link>
          <Link href="/security" className="hover:text-slate-600">
            Security
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
          <Link href="/verify" className="hover:text-slate-600">
            Verify a document
          </Link>
        </p>
      </footer>
    </main>
  );
}
