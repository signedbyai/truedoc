import type { Metadata } from "next";
import Link from "next/link";
import { ReferralCapture } from "@/components/referral-capture";
import { HomepageTier1Preview } from "@/components/homepage-tier1-preview";
import { getRequestCurrency } from "@/lib/currency.server";

// Self-canonical so the homepage is the one indexed URL for the brand — title
// and description are inherited from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// 2026-08-12, direct ask: "deploy preview-B as the new home page." Promotes
// what had been the unlinked /home-preview-b route (Tier 1 redesign, +
// developer/API section) to the real homepage — same component
// (HomepageTier1Preview) with the same showDeveloperSection=true variant B
// used, just without that route's own "Internal preview" banner.
//
// Dropped along with the old homepage-current.tsx / homepage-two-column.tsx
// A/B setup: ctaColorFlag (already concluded/locked to "purple" since
// 2026-07-24 — HomepageTier1Preview's CtaLink already hardcodes "purple", so
// calling the flag would just re-derive a value nothing here reads) and
// homepageVariantFlag (already paused/hardcoded to "current" since
// 2026-07-27 — there's no more "current vs v20" choice to make; this page IS
// the new "current"). Neither flag is deleted from src/flags.ts — same "kept
// for a future test" convention that file already documents — just no
// longer called from this specific page.
//
// The pre-promotion homepage is preserved as homepage-versions/ v26
// (homepage-current.tsx + homepage-two-column.tsx + this router file, as
// they were immediately before this change) — see that folder's INDEX.md to
// restore it.
export default async function LandingPage() {
  // EUR for Eurozone visitors, USD for the rest (from geo/cookie) — same
  // resolution the /pricing page and checkout use, so the figures stay in
  // sync across the whole funnel. See src/lib/currency.ts.
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ReferralCapture />
      <HomepageTier1Preview currency={currency} showDeveloperSection />

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
