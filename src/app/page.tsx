import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Drag-and-drop fields",
    description: "Place signature, initials, date, and text fields directly on the PDF in seconds.",
  },
  {
    title: "Multi-signer routing",
    description: "Sequential or parallel signing order, with automatic reminders until it's done.",
  },
  {
    title: "Audit-ready by default",
    description: "Every action is timestamped, hashed, and IP-logged — ESIGN and UETA compliant out of the box.",
  },
  {
    title: "No per-seat tax",
    description: "Flat, transparent pricing built for solo professionals and small teams, not enterprise procurement.",
  },
];

// Only SyncMint is a real early customer right now — the other four are
// placeholder names/logos again (back to the original set from before any
// real client logos were wired in) until more real logos actually come in.
const TRUSTED_BY = [
  { name: "Ironwood Builders", src: "/logos/ironwood-builders.png", height: "h-5" },
  { name: "Hartwell Accounting", src: "/logos/hartwell-accounting.png", height: "h-5" },
  { name: "Crestline Realty", src: "/logos/crestline-realty.png", height: "h-5" },
  { name: "Ashcroft Law Group", src: "/logos/ashcroft-law-group.png", height: "h-5" },
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
];

const PRICING = [
  { name: "Free", price: "$0", blurb: "3 documents/mo, 1 user" },
  { name: "Starter", price: "$7/mo", blurb: "Unlimited documents, 1 user" },
  { name: "Team", price: "$14/mo", blurb: "Up to 3 users, bulk send" },
  { name: "Business", price: "$29/mo", blurb: "Up to 5 users, API access" },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tracking-tight text-slate-900">SignedBy</span>
          <span className="text-xs font-medium text-slate-400">BETA</span>
        </span>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          E-signatures, without the per-seat tax.
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          SignedBy is a fast, affordable alternative for e-Signatures — built for solo professionals and
          small teams who sign a handful of documents a month, not a whole sales floor.{" "}
          <span className="inline-block -rotate-1 rounded bg-yellow-300 px-1.5 py-0.5 font-semibold text-slate-900">
            Sign documents.
          </span>
        </p>
        <Link href="/login?intent=signup" className={buttonVariants({ size: "lg" })}>
          Start for free
        </Link>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          Trusted by
        </p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((logo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${logo.name}-${i}`}
                src={logo.src}
                alt={logo.name}
                className={`${logo.height} w-auto shrink-0 opacity-40 grayscale transition-opacity hover:opacity-70`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Simple pricing</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING.map((p) => (
            <Card key={p.name} className="text-center">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{p.price}</p>
                <p className="mt-2 text-xs text-slate-500">{p.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            See full plan details →
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
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
