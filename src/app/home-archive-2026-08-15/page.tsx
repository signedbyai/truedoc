import type { Metadata } from "next";
import Link from "next/link";
import { HomepageTier1Preview } from "@/components/homepage-tier1-preview";
import { getRequestCurrency } from "@/lib/currency.server";

// Snapshot of the live homepage as it stood on 2026-08-15, immediately
// before variant G was promoted to "/". Direct ask: "can we save the current
// signedby.ai home page as a snapshot, and push home page variant g to
// production."
//
// This is a byte-faithful copy of the outgoing src/app/page.tsx body — the
// Tier 1 layout with the developer/API section (what had been variant B,
// promoted to the homepage on 2026-08-12) — with three deliberate
// differences, all of which are archive hygiene rather than content:
//
//   1. noindexed and given its own title, so it cannot compete with "/" in
//      search. The outgoing page was self-canonical to "/".
//   2. <ReferralCapture /> removed. That component writes the referral
//      cookie on mount; an archive route firing it would attribute referrals
//      to a page nobody is meant to land on. It lives on the real homepage.
//   3. An internal-preview banner, matching /home-preview-a..g.
//
// Note the same layout is also still reachable at /home-preview-b, which is
// where it originated. This route exists so the exact promoted-homepage
// state has its own dated anchor, independent of the preview series.
//
// To roll back: copy this file's <main> body over src/app/page.tsx, restore
// <ReferralCapture />, restore `alternates: { canonical: "/" }`, and drop
// the banner and the robots directive.
export const metadata: Metadata = {
  title: "Homepage archive — 2026-08-15 (pre-variant-G) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomeArchive20260815Page() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Archive — the live homepage as it stood on 15 August 2026, immediately before{" "}
        <a href="/home-preview-g" className="underline hover:text-white">
          variant G
        </a>{" "}
        was promoted to production. Kept for rollback and comparison. Not linked from the live site.
      </div>

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
