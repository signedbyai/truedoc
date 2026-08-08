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
// footer (see that page's own comment), and from a sentence in that page's
// "Start from a real template" section (added same day as this revision).
//
// Revised same day per direct ask: simplified Part 1 down to a single flow
// built around "upload your own existing form" (most rental operators
// already have paperwork), with the built-in-template path demoted to a
// "Bonus" callout underneath rather than a co-equal Option A/B choice.
// Also added an inline screenshot mockup to every numbered step -- asked
// the user real-app-screenshot vs. stylized-mockup, they chose stylized
// (see generate-guide-screenshots-boat-jet-ski-rental.tsx's own comment).
const TITLE = "How to Set Up Boat & Jet Ski Rental Agreements — SignedBy";
const DESCRIPTION =
  "Step-by-step: upload your existing boat or jet ski rental form into SignedBy, and how sending, sharing, and signing actually works with a renter.";
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

// Rebuilt 2026-08-08 per direct ask ("make sure the image examples are also
// based on mobile"): all ten inline step mockups are now portrait/mobile
// (1170 wide, height sized per step's actual content -- see
// generate-guide-screenshots-boat-jet-ski-rental.tsx), matching the one
// reused real asset that was already portrait (hero-signer-mobile.png) and
// the page's own hero. Every step sets its own imageHeight since content
// height varies a lot step to step (a short "Add" button card vs. a
// full-height document canvas); imageWidth is 1170 across the board except
// hero-signer-mobile.png's native 1236.
//
// Rebuilt AGAIN same day: these were displayed capped at max-w-xs (320px),
// a ~27% scale-down from the 1170px canvas that made the mockups' body text
// illegible (16-19px source text landing around 4-5px on screen) regardless
// of device. Fixed two ways together (direct ask): the generator script now
// authors every step with noticeably larger type/buttons/padding, AND these
// display near the step card's full width instead of a fixed cap -- see the
// shared `w-full` (no max-w override) below.
//
// Rebuilt a THIRD time same day: even at full width with big type, these
// still read as generic flat cards, not phone screens -- no status bar, no
// home indicator (see generate-guide-screenshots-boat-jet-ski-rental.tsx's
// own comment for the full story, including a uniform-tall-canvas attempt
// that was reverted for leaving too much blank scroll). imageHeight values
// below were updated to match that script's current per-step heights.
type GuideStep = {
  title: string;
  image: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageClassName?: string;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Upload your existing form",
    image: "/guide-boat-upload-form.png",
    imageWidth: 1170,
    imageHeight: 1300,
    body: "New Document → Sign tab. Upload the PDF (or a clean photo/scan saved as a PDF) — SignedBy places fields on top of the page by position, not by editing the underlying content, so a scanned image works exactly like a typed PDF here.",
  },
  {
    title: "SignedBy detects your signing parties",
    image: "/guide-boat-detected-signers.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "SignedBy tries to identify the distinct signing parties (e.g. \"Owner\" and \"Renter\") from the text itself. If it recognizes them, you'll see a \"we detected N signers\" prompt — confirm it and drop in an email per party instead of building recipients from scratch.",
  },
  {
    title: "Review the suggested fields",
    image: "/guide-boat-review-fields.png",
    imageWidth: 1170,
    imageHeight: 1450,
    body: "Signature, initials, date, text, and checkbox fields are all available. Adjust anything that's off — nothing is placed until you approve it.",
  },
  {
    title: "Decide what's fixed vs. per-rental",
    image: "/guide-boat-fixed-vs-rental.png",
    imageWidth: 1170,
    imageHeight: 1050,
    body: "Your business name, base price, deposit, and late fee are usually the same every time — type those in directly. Renter-specific details are better left as fields the renter fills in themselves, or that you type in fresh each time.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Start the document",
    image: "/guide-boat-start-document.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Dashboard → Templates → Use template (or New Document → Sign, if you haven't saved one yet). Fill in whatever's specific to this rental — which vessel, the date, the price if it varies.",
  },
  {
    title: "Add the renter as a recipient",
    image: "/guide-boat-add-recipient.png",
    imageWidth: 1170,
    imageHeight: 670,
    body: "One email address is all that's required — it's also what ties the signed document and audit trail to a real person afterward.",
  },
  {
    title: "Send",
    image: "/guide-boat-send-actions.png",
    imageWidth: 1170,
    imageHeight: 910,
    body: "This is the point where the document leaves \"draft.\" SignedBy emails the renter automatically, and three more ways to get the link onto their phone show up right in the signer's row: Copy link, Share to sign (opens their phone's native share sheet), and QR to sign (a scannable code for the same link). You don't have to wait for the email — any of the three gets them to the signing page immediately.",
  },
  {
    title: "Renter's side",
    image: "/hero-signer-mobile.png",
    imageAlt: "A signer signing the same document on their phone: a handwritten signature drawn in the signature pad, with a yellow slide-to-sign bar ready to submit",
    imageWidth: 1236,
    imageHeight: 2370,
    // Much taller aspect ratio than the other nine (a real full-screen phone
    // capture, not an authored mockup) -- at the shared full-card-width
    // display it'd render ~1250px tall, towering over review-fields (the
    // tallest authored mockup, ~805px at that width). Capped narrower so
    // its displayed height lands in the same ballpark as the others.
    imageClassName: "mx-auto w-full max-w-sm",
    body: "They open the link on their own phone. If you've turned on per-recipient email verification (free, optional, every plan), they confirm a one-time code first. Then they read the agreement, fill in anything assigned to them, and sign with a draw-your-signature pad and a slide-to-sign confirmation — no app or account needed on their end.",
  },
  {
    title: "You find out immediately",
    image: "/guide-boat-notified.png",
    imageWidth: 1170,
    imageHeight: 1250,
    body: "The moment they sign, you're notified and the document's status updates in your dashboard. The Copy/Share/QR/Send reminder actions for that signer disappear — nothing left to hand them once they're done.",
  },
  {
    title: "If they haven't signed yet",
    image: "/guide-boat-reminder.png",
    imageWidth: 1170,
    imageHeight: 670,
    body: "A Send reminder button sits right next to their name — one click re-emails them without you having to track it manually.",
  },
  {
    title: "The record stays put",
    image: "/guide-boat-audit-trail.png",
    imageWidth: 1170,
    imageHeight: 950,
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
          Two parts: getting the rental agreement you already use into SignedBy once, and what actually happens
          between you and a renter every time you send it after that.
        </p>
        {/* Hero: the main operator-to-customer interaction for this vertical
            is in-person at the dock -- hand the renter your phone, they scan
            a QR code, they sign. Added 2026-08-08 per direct ask; revised
            same day to a portrait mobile shot (most operators run this from
            their phone, not a desktop) with an explicit "Tap here" callout
            on the QR to sign button so first-timers know which control to
            press, not just what it produces. Previously this intro section
            was text-only. */}
        <Image
          src="/hero-boat-jet-ski-rental-qr-signing.png"
          alt="A phone screen showing a 'Tap here to bring up the QR' callout pointing at the QR to sign button, and below it the resulting 'Scan to open' panel with a real QR code the renter scans with their own phone camera"
          width={1170}
          height={1300}
          className="mt-2 w-full max-w-sm rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/boat-jet-ski-rental" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Back to Boat & Jet Ski Rental
        </Link>
      </section>

      {/* Part 1 -- rebuilt 2026-08-08 around "you already have paperwork":
          most rental operators are uploading an existing form, not writing
          one from scratch, so that's the single flow here now. The
          built-in-template path (formerly a co-equal "Option A") moved to
          the Bonus callout below rather than competing for the same
          attention. */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-2xl font-semibold text-slate-900">Part 1 — Setting up your rental agreement</h2>
        <p className="mt-2 text-sm text-slate-600">
          Most rental operators already have a rental agreement — even a scanned or photographed paper form. Upload
          it once, place the fields, and save it as a reusable template.
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
                alt={step.imageAlt ?? step.title}
                width={step.imageWidth ?? 1170}
                height={step.imageHeight ?? 900}
                className={`mx-auto mt-3 w-full rounded-lg border border-slate-200 ${step.imageClassName ?? ""}`}
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
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

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5">
          <h3 className="text-base font-semibold text-slate-900">Bonus — Don&apos;t have a form yet? Start from ours</h3>
          <p className="mt-2 text-sm text-slate-600">
            SignedBy also ships with a ready-made Boat & Jet Ski Rental Agreement — built from a real marine rental
            contract, covering vessel condition at handover, ID capture, damage/fine liability, a late-return fee,
            an insurance acknowledgment, and an injury-liability disclaimer.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">On the Free plan:</strong> open{" "}
            <Link href="/templates/boat-jet-ski-rental-agreement-template" className="underline underline-offset-2 hover:text-slate-900">
              the free template
            </Link>
            , copy the example text, paste it into a doc, fill in your business name and pricing, export it as a
            PDF, and upload it using the same steps above.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">On the Pro plan ($7/mo):</strong> in your dashboard,{" "}
            <strong className="font-semibold text-slate-900">New Document → Draft tab</strong> → pick &quot;Boat &
            Jet Ski Rental Agreement&quot; → describe your specifics in plain language (vessel type, price, deposit,
            late fee) → review the generated draft, edit anything that&apos;s off, and finalize it.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-semibold text-slate-900">Part 2 — How the flow works between you and the renter</h2>
        <p className="mt-2 text-sm text-slate-600">This is what actually happens once the template exists and someone shows up to rent a boat or jet ski.</p>

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
                alt={step.imageAlt ?? step.title}
                width={step.imageWidth ?? 1170}
                height={step.imageHeight ?? 900}
                className={`mx-auto mt-3 w-full rounded-lg border border-slate-200 ${step.imageClassName ?? ""}`}
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
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
