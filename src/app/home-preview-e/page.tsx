import type { Metadata } from "next";
import Link from "next/link";
import { HomepagePreviewE } from "@/components/homepage-preview-e";
import { getRequestCurrency } from "@/lib/currency.server";

// Variant E, direct ask 2026-08-13: a cleanup pass on D (not a new
// structure) — fixes the reported hero jump + left/right imbalance. See
// homepage-preview-e.tsx and homepage-preview-e-tabs.tsx's own comments
// for exactly what changed and why. Private, unlinked, noindexed — same
// status as /home-preview-a/b/c/d.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1 — E, D cleanup pass) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewEPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — variant E, a cleanup pass on{" "}
        <a href="/home-preview-d" className="underline hover:text-white">
          D
        </a>
        : fixed-height hero image slot + top-aligned columns (no more jump switching tabs), larger left-column type
        to better match the hero image's height — not linked from the live site.
      </div>

      <HomepagePreviewE currency={currency} />

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
