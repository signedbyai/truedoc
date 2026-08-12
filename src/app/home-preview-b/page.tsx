import type { Metadata } from "next";
import Link from "next/link";
import { HomepageTier1Preview } from "@/components/homepage-tier1-preview";
import { getRequestCurrency } from "@/lib/currency.server";

// Variant B of the Tier 1 homepage preview (2026-08-12, direct ask) — same
// page as /home-preview-a, plus a Documenso-inspired developer/API section
// (see DeveloperApiSection in homepage-tier1-preview.tsx for the real
// content and what was/wasn't copied from documenso.com). Private,
// unlinked, noindexed — same status as /home-preview-a, just a second
// route so the two can be compared side by side rather than overwriting A.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1 — B, + developers) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewBPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — Tier 1, variant B (adds a developer/API section, Documenso-inspired), not linked from the
        live site. See also <a href="/home-preview-a" className="underline hover:text-white">variant A</a>.
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
