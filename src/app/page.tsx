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

const PRICING = [
  { name: "Free", price: "$0", blurb: "3 documents/mo, 1 user" },
  { name: "Starter", price: "$7/mo", blurb: "Unlimited documents, 1 user" },
  { name: "Team", price: "$14/mo", blurb: "Shared templates, bulk send" },
  { name: "Business", price: "$29/mo", blurb: "Up to 5 users, API access" },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight text-slate-900">SignedBy</span>
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
          small teams who sign a handful of documents a month, not a whole sales floor.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign up free
        </Link>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month.</p>
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
        </p>
      </footer>
    </main>
  );
}
