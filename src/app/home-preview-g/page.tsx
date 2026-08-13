import type { Metadata } from "next";
import Link from "next/link";
import { HomepagePreviewG } from "@/components/homepage-preview-g";
import { getRequestCurrency } from "@/lib/currency.server";

// Variant G, direct ask 2026-08-13: "can we try a Variant G with the
// rotating carousel to see that in action". Identical to F except the
// product tabs auto-advance every 5s instead of waiting for a tap —
// F's problem being that with 92% mobile traffic most visitors never tap,
// so three of the four products are never seen. Rotation stops for good
// once the visitor taps a tab, pauses on hover/focus, and is disabled
// entirely under prefers-reduced-motion; see homepage-preview-g-tabs.tsx.
// Private, unlinked, noindexed — same status as /home-preview-a..f.
export const metadata: Metadata = {
  title: "Homepage preview (Tier 1 — G, auto-rotating tabs) — SignedBy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewGPage() {
  const currency = await getRequestCurrency();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="bg-slate-900 px-6 py-2 text-center text-xs text-slate-300">
        Internal preview — variant G, the auto-rotating version of{" "}
        <a href="/home-preview-f" className="underline hover:text-white">
          F
        </a>
        : product tabs advance every 5s on their own, stop for good once you tap one, pause on hover, and don&apos;t
        rotate at all under reduced-motion. Everything else is identical to F. Not linked from the live site.
      </div>

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
