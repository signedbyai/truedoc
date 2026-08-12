import type { Metadata } from "next";
import Link from "next/link";
import { HomepageTier1Preview } from "@/components/homepage-tier1-preview";
import { getRequestCurrency } from "@/lib/currency.server";

// Tier 1 homepage variant from ARACOR_INSPIRED_PRIORITIES.md — direct ask
// 2026-08-11: "Can we do Tier 1 but as a homepage variant we can look at
// on dev initially." A private, unlinked route rather than a change to
// the live homepage or a third value on homepageVariantFlag (src/flags.ts)
// — nothing here is measured or traffic-split, it's just a page to look
// at before deciding whether to promote any of it. noindex so it never
// gets crawled/indexed as a duplicate homepage in the meantime.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — Tier 1 (hero crossfade + screenshot-paired reasons), not linked from the live site.
      </div>

      <HomepageTier1Preview currency={currency} />

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
