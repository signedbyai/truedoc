import type { Metadata } from "next";
import Link from "next/link";
import { HomepagePreviewF } from "@/components/homepage-preview-f";
import { getRequestCurrency } from "@/lib/currency.server";

// Variant F, direct ask 2026-08-13: "sure lets an alternative to
// compare" — an A/B against E's mobile tab-pill treatment only. E used a
// deliberate 2x2 grid of icon+label pills below sm; F uses icon-only
// pills in a single row instead (labels reappear at sm+). Everything
// else is identical to E. See homepage-preview-f-tabs.tsx's own comment
// for the width math. Private, unlinked, noindexed — same status as
// /home-preview-a/b/c/d/e.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1 — F, icon-only mobile pills) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewFPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — variant F, a mobile-pill A/B against{" "}
        <a href="/home-preview-e" className="underline hover:text-white">
          E
        </a>
        : icon-only pills in a single row below sm instead of E&apos;s 2x2 grid — labels return at sm+. Everything
        else is identical to E. Not linked from the live site.
      </div>

      <HomepagePreviewF currency={currency} />

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
