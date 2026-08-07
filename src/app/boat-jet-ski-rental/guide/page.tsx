import type { Metadata } from "next";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { CtaLink } from "@/components/cta-link";
import { LanguageSupportRow } from "@/components/language-support-row";
import { ctaColorFlag } from "@/flags";

// Setup/signing walkthrough for /boat-jet-ski-rental, added 2026-08-08 per
// direct ask ("write up a how to... make that a how [to] web page"). Same
// header/footer chrome as every other public page in this family
// (board-resolutions, auto-sales, /templates/[slug]) rather than inventing
// new page furniture. Linked from the bottom of /boat-jet-ski-rental's own
// footer (see that page's own comment).
const TITLE = "How to Set Up Boat & Jet Ski Rental Agreements — SignedBy";
const DESCRIPTION =
  "Step-by-step: set up your boat or jet ski rental agreement in SignedBy (built-in template or your own existing form), and how sending, sharing, and signing actually works with a renter.";
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/boat-jet-ski-rental/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/boat-jet-ski-rental/guide", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const SIGNUP_HREF =
  "/login?intent=signup&utm_source=boat_jet_ski_rental_guide&utm_medium=cta&utm_campaign=boat_jet_ski_rental_page";

const FLOW_STEPS = [
  {
    title: "Start the document",
    body: "Dashboard → Templates → Use template (or New Document → Sign, if you haven't saved one yet). Fill in whatever's specific to this rental — which vessel, the date, the price if it varies.",
  },
  {
    title: "Add the renter as a recipient",
    body: "One email address is all that's required — it's also what ties the signed document and audit trail to a real person afterward.",
  },
  {
    title: "Send",
    body: "This is the point where the document leaves \"draft.\" SignedBy emails the renter automatically, and three more ways to get the link onto their phone show up right in the signer's row: Copy link, Share to sign (opens their phone's native share sheet), and QR to sign (a scannable code for the same link). You don't have to wait for the email — any of the three gets them to the signing page immediately.",
  },
  {
    title: "Renter's side",
    body: "They open the link on their own phone. If you've turned on per-recipient email verification (free, optional, every plan), they confirm a one-time code first. Then they read the agreement, fill in anything assigned to them, and sign with a draw-your-signature pad and a slide-to-sign confirmation — no app or account needed on their end.",
  },
  {
    title: "You find out immediately",
    body: "The moment they sign, you're notified and the document's status updates in your dashboard. The Copy/Share/QR/Send reminder actions for that signer disappear — nothing left to hand them once they're done.",
  },
  {
    title: "If they haven't signed yet",
    body: "A Send reminder button sits right next to their name — one click re-emails them without you having to track it manually.",
  },
  {
    title: "The record stays put",
    body: "The signed document, timestamps, and a full audit trail live in your dashboard for as long as you need them — exactly what you'd want on hand if a damage or late-return dispute ever comes up.",
  },
];

export default async function BoatJetSkiRentalGuidePage() {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">For boat & jet ski rental operators</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Setup & signing guide</h1>
        <p className="max-w-xl text-base text-slate-600">
          Two parts: getting your rental agreement into SignedBy once, and what actually happens between you and a
          renter every time you send it after that.
        </p>
        <Link href="/boat-jet-ski-rental" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Back to Boat & Jet Ski Rental
        </Link>
      </section>

      {/* Part 1 */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-2xl font-semibold text-slate-900">Part 1 — Setting up your rental agreement</h2>
        <p className="mt-2 text-sm text-slate-600">
          You have two starting points. Pick whichever matches your situation — both end up in the same place: a
          document with fields placed, ready to save as a reusable template.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900">Option A — Start from SignedBy&apos;s built-in template</h3>
          <p className="mt-2 text-sm text-slate-600">
            SignedBy ships with a ready-made Boat & Jet Ski Rental Agreement — built from a real marine rental
            contract, so it already covers vessel condition at handover, ID capture, damage/fine liability, a
            late-return fee, an insurance acknowledgment, and an injury-liability disclaimer, not just a generic
            &quot;please sign here.&quot;
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">On the Free plan:</strong> open{" "}
            <Link href="/templates/boat-jet-ski-rental-agreement-template" className="underline underline-offset-2 hover:text-slate-900">
              the free template
            </Link>
            , copy the example text, paste it into a doc, fill in your business name and pricing, and export it as a
            PDF. Then use Option B below (the Sign tab) to upload it — everything from there is identical either way.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">On the Pro plan ($7/mo):</strong> in your dashboard,{" "}
            <strong className="font-semibold text-slate-900">New Document → Draft tab</strong> → pick &quot;Boat &
            Jet Ski Rental Agreement&quot; → describe your specifics in plain language (vessel type, price, deposit,
            late fee) → review the generated draft, edit anything that&apos;s off, and finalize it.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900">Option B — Use your own existing form</h3>
          <p className="mt-2 text-sm text-slate-600">
            If you already have a rental agreement — even a scanned or photographed paper form — you don&apos;t need
            to retype it.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>
              <strong className="font-semibold text-slate-900">New Document → Sign tab.</strong>
            </li>
            <li>
              Upload the PDF (or a clean photo/scan saved as a PDF). SignedBy places fields on top of the page by
              position, not by editing the underlying content, so a scanned image works exactly like a typed PDF
              here.
            </li>
            <li>
              SignedBy tries to identify the distinct signing parties (e.g. &quot;Owner&quot; and &quot;Renter&quot;)
              from the text itself. If it recognizes them, you&apos;ll see a &quot;we detected N signers&quot;
              prompt — confirm it and drop in an email per party instead of building recipients from scratch.
            </li>
            <li>
              Review the suggested field placements (signature, initials, date, text, checkbox are all available)
              and adjust anything that&apos;s off. Nothing is placed until you approve it.
            </li>
            <li>
              Decide what&apos;s fixed and what&apos;s per-rental: your business name, base price, deposit, and late fee are
              usually the same every time — type those in directly. Renter-specific details are better left as
              fields the renter fills in themselves, or that you type in fresh each time.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Making it reusable</h3>
          <p className="mt-2 text-sm text-slate-600">
            Once the layout is right, click <strong className="font-semibold text-slate-900">Save as template</strong>.
            From then on, starting a new rental agreement is: Templates (in the dashboard nav) → find it → Use
            template → fill in this renter&apos;s details → send. You&apos;re not rebuilding the field layout every
            time.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Save as template requires the Pro plan ($7/mo). On the Free plan you can still send this exact agreement
            — you&apos;ll just be re-uploading/re-placing fields each time. Free also caps you at 3 documents a month;
            Pro is unlimited.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-semibold text-slate-900">Part 2 — How the flow works between you and the renter</h2>
        <p className="mt-2 text-sm text-slate-600">This is what actually happens once the template exists and someone shows up to rent a boat or jet ski.</p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4 px-5 py-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Good to know</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Optional extras worth turning on: a link expiration (so a same-day rental&apos;s link stops working after
              the pickup window), and the per-recipient email verification mentioned above — both free on every
              plan.
            </li>
            <li>
              If you track yourself (the Owner) as a second signer alongside the Renter, signing runs in order:
              SignedBy notifies the first party, and the second party&apos;s Copy/Share/QR links only become available
              once the first party finishes. For the &quot;hand them a QR code and they sign on the spot&quot; flow above to
              work instantly, keep the Renter as the only tracked signer — you&apos;re the account holder preparing the
              document, not a second recipient waiting in line.
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Try SignedBy free</h2>
        <p className="mt-2 text-sm text-slate-600">3 documents a month, no credit card, upgrade only if you need more.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color={ctaColor} page="boat-jet-ski-rental-guide" position="footer">
          Start for free →
        </CtaLink>
        <div className="mt-5">
          <LanguageSupportRow />
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/boat-jet-ski-rental" className="hover:text-slate-600">
            Boat & Jet Ski Rental
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
