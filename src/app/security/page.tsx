import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";

const TITLE = "Security & compliance — SignedBy";
const DESCRIPTION =
  "How SignedBy keeps documents safe and signatures defensible: a timestamped, IP-logged audit trail, SHA-512 document fingerprints, free public verification, ESIGN and UETA compliance, and EEA-based processing.";

// Same shared-opengraph-image note as the /vs pages: a page that overrides
// metadata must point back at the shared image or it inherits none.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/security" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/security", images: SHARED_IMAGE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

// Everything on this page is deliberately limited to what the product
// actually does today — each claim maps to real behaviour (see the file
// references in the comments) rather than aspiration. A security page that
// overstates is worse than none: it's the page a cautious buyer checks
// hardest, and the one a dispute would quote back.
const AUDIT_ITEMS: { label: string; detail: string }[] = [
  {
    label: "Every action is timestamped",
    // audit_events rows: created / sent / viewed / signed / declined / voided
    detail:
      "Creating, sending, opening, signing, declining, and voiding a document each write an immutable audit event with the exact time it happened.",
  },
  {
    label: "IP address and device recorded",
    detail:
      "Each signing event captures the signer's IP address and browser user-agent, so a signature can be tied to when and where it was made.",
  },
  {
    label: "Explicit consent, captured",
    detail:
      "A signer must actively tick a consent box confirming they intend to sign electronically before they can submit — the deliberate act that makes an e-signature binding.",
  },
  {
    label: "Certificate of Completion",
    detail:
      "Every completed document gets a certificate listing the document ID, each signer with their signing time and IP, and the document's cryptographic fingerprint.",
  },
];

const PROTECTION_ITEMS: { label: string; detail: string }[] = [
  {
    label: "Encrypted in transit and at rest",
    detail: "Documents travel over TLS and are stored encrypted.",
  },
  {
    label: "Isolated per workspace",
    // Row-level security enabled across documents, signers, fields, audit
    // events, page views, orgs, members, invites, subscriptions, referrals.
    detail:
      "Row-level security is enforced in the database, so one workspace's documents, signers, and audit history can't be read by another.",
  },
  {
    label: "Unguessable signing links",
    detail:
      "Signers don't need an account. Each signer gets their own long, unguessable link that only opens their fields — never another signer's.",
  },
  {
    label: "API keys stored hashed",
    // api-key.ts — sha256 of the raw key; only a prefix is retained for display
    detail:
      "API keys are hashed before storage, so the full key exists only in your hands. Regenerating instantly invalidates the previous one.",
  },
];

export default function SecurityPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="hover:opacity-80">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 pt-10 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Security &amp; compliance</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          A signature is only worth as much as the evidence behind it. Here&apos;s exactly what SignedBy records, how
          your documents are protected, and how anyone can independently check that a signed document is genuine.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-14">
        <h2 className="text-2xl font-semibold text-slate-900">Legally binding by default</h2>
        <p className="mt-3 text-slate-600">
          Documents signed with SignedBy are electronic signatures under the U.S. ESIGN Act and UETA. What makes one
          hold up isn&apos;t the look of the mark — it&apos;s the record of intent behind it, which we capture on every
          document, on every plan.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {AUDIT_ITEMS.map((i) => (
            <div key={i.label}>
              <dt className="text-sm font-semibold text-slate-900">{i.label}</dt>
              <dd className="mt-1 text-sm text-slate-600">{i.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-14">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Anyone can verify a document — free, no account</h2>
          <p className="mt-3 text-slate-600">
            When a document completes, we take a <span className="font-medium text-slate-900">SHA-512 fingerprint</span>{" "}
            of the final signed PDF and print it on the Certificate of Completion. Change so much as one character of
            that PDF and the fingerprint no longer matches.
          </p>
          <p className="mt-3 text-slate-600">
            That means a counterparty, an accountant, or a court doesn&apos;t have to take your word for it — or ours.
            Anyone holding the file can check it themselves, without a SignedBy account and without contacting us.
          </p>
          <p className="mt-3 text-slate-600">
            That fingerprint is also given an independent timestamp: every seal is submitted to a real Time Stamping
            Authority — Sectigo&apos;s public RFC 3161 service, with FreeTSA as an automatic fallback — which signs
            the hash together with the time. That&apos;s a neutral third party&apos;s proof of exactly when the
            document existed, not just an entry in SignedBy&apos;s own database.
          </p>
          <Link href="/verify" className={`${buttonVariants({ size: "sm" })} mt-5`}>
            Verify a document →
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-14">
        <h2 className="text-2xl font-semibold text-slate-900">How your documents are protected</h2>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {PROTECTION_ITEMS.map((i) => (
            <div key={i.label}>
              <dt className="text-sm font-semibold text-slate-900">{i.label}</dt>
              <dd className="mt-1 text-sm text-slate-600">{i.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-14">
        <h2 className="text-2xl font-semibold text-slate-900">Data protection and where your data lives</h2>
        <p className="mt-3 text-slate-600">
          SignedBy is operated by SPRK10 B.V., a company registered in the Netherlands, and processing is kept within
          the European Economic Area. We use a small, named set of sub-processors — hosting, storage, email, payments,
          and the AI provider behind our AI-assisted features (Mistral AI, based in France). They&apos;re each listed,
          with what they do and where they sit, in our{" "}
          <Link href="/dpa" className="font-medium text-slate-900 underline underline-offset-2">
            Data Processing Agreement
          </Link>
          .
        </p>
        <p className="mt-3 text-slate-600">
          Our{" "}
          <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          sets out exactly what we collect from senders and signers, why, and how long we keep it.
        </p>
      </section>

      {/* Being straight about the limits is part of being credible — and it
          sets up the AES/QES tier sitting in the product backlog. */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900">What we don&apos;t claim</h2>
        <p className="mt-3 text-slate-600">
          SignedBy produces what eIDAS calls a Simple Electronic Signature: identity is established by control of the
          email address the document was sent to, backed by the audit trail above. That is valid and enforceable under
          ESIGN and UETA, and for the great majority of business agreements it&apos;s exactly what&apos;s used.
        </p>
        <p className="mt-3 text-slate-600">
          We don&apos;t currently offer Advanced or Qualified Electronic Signatures (AES/QES), which add per-signer
          certificates and government-ID verification. Some documents also can&apos;t be signed electronically at all in
          many jurisdictions — wills, certain family-law papers, and some property and hazardous-goods documents. If
          your matter needs one of those, use a provider or process built for it.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Questions from a security or procurement review? Email{" "}
          <a href="mailto:security@signedby.ai" className="font-medium text-slate-700 underline underline-offset-2">
            security@signedby.ai
          </a>{" "}
          and we&apos;ll answer directly.
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verify" className="hover:text-slate-600">
            Verify a document
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
          <Link href="/dpa" className="hover:text-slate-600">
            DPA
          </Link>
        </p>
      </footer>
    </main>
  );
}
