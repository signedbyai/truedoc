import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";

// First post under /research (2026-08-15). The finding is the product here,
// not the tool: "free PDF verifier" is a category nobody searches for, while
// "every signed document has a date after which you can't prove it was valid"
// is novel, checkable in 30 seconds on the reader's own file, and true.
//
// EDITORIAL RULE THIS PAGE IS BUILT ON: it opens and closes on OUR OWN
// horizon being 2037-06-24, the same as everyone else's. Any version that
// reads "competitors are broken, we're fine" would be both dishonest (the
// limitation is structural, not anyone's mistake) and far less persuasive.
// The competitor document referenced is deliberately unnamed -- it was
// research material, its setup was competent, and naming it would pick a
// fight over something that isn't their fault.
//
// Bylined to a person, not the company: the piece contains admissions
// ("a mistake we were on course to make ourselves") that read as candour
// from an engineer and as positioning from a brand.
//
// Numbers verified 2026-08-14 via scripts/test-archive-timestamp.mjs against
// live TSAs, then corroborated independently with pyHanko + asn1crypto rather
// than trusting our own verifier's output.

const TITLE = "Your signed documents have an expiry date on their proof — SignedBy";
const DESCRIPTION =
  "Every electronically signed document has a date after which you can no longer demonstrate it was validly signed. We tested whether PAdES archive timestamps fix it. They moved the horizon zero days — and 319 days backwards with one authority.";
const URL = "https://signedby.ai/research/signed-pdf-proof-expiry";
const PUBLISHED = "2026-08-15";

// A page that overrides metadata must point back at the shared image or it
// inherits none -- same note as /security and the /vs pages.
const SHARED_IMAGE = ["/opengraph-image"];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/research/signed-pdf-proof-expiry" },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    images: SHARED_IMAGE,
    publishedTime: PUBLISHED,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: SHARED_IMAGE },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Your signed documents have an expiry date on their proof",
  description: DESCRIPTION,
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: { "@type": "Person", name: "Michael Eagles" },
  publisher: { "@type": "Organization", name: "SignedBy", url: "https://signedby.ai" },
  mainEntityOfPage: { "@type": "WebPage", "@id": URL },
};

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-slate-700">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 text-2xl font-semibold tracking-tight text-slate-900">{children}</h2>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-[12.5px] leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

export default function ProofExpiryPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="hover:opacity-80">
          <Image
            src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
            alt="SignedBy"
            width={266}
            height={64}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <article className="mx-auto w-full max-w-2xl px-6 pt-8 pb-20">
        <Link href="/research" className="text-sm text-slate-500 hover:text-slate-800">
          ← Research
        </Link>

        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          Your signed documents have an expiry date on their proof
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Michael Eagles, founder of SignedBy · 15 August 2026
        </p>

        <P>
          Take a contract you signed electronically. It is sitting in a folder somewhere, and as far as you are
          concerned it is settled — signed, filed, done.
        </P>
        <P>
          There is a date, probably in the mid-2030s, after which nobody will be able to demonstrate that it was
          validly signed.
        </P>
        <P>
          Not that it becomes invalid. Nothing about the document changes. What changes is your ability to{" "}
          <em>show</em> it was valid, from the file alone, to someone who was not there.
        </P>
        <P>
          <strong>We found this in our own product first.</strong>
        </P>

        <H2>Where the date comes from</H2>
        <P>
          An electronic signature is only as demonstrable as the certificate behind it, and certificates expire. That
          is not a flaw; it is the design.
        </P>
        <P>
          So a signature carries a timestamp from a trusted authority, proving the signature existed while its
          certificate was still valid. Now the question moves up a level: that timestamp has a certificate too, and
          that one expires as well.
        </P>
        <P>
          Follow the chain to the end and you arrive at a date. After it, the outermost proof can no longer be checked,
          and the whole structure beneath it stops being demonstrable.
        </P>
        <P>
          Ours is <strong>2037-06-24</strong>.
        </P>
        <P>
          We checked a document signed through another vendor — a competent setup, using two separate qualified
          providers — and theirs is <strong>2035-12-13</strong>.
        </P>
        <P>
          Eleven years is fine for an invoice. It is not fine for a lease, a shareholders&rsquo; agreement, a
          construction contract, or anything with a retention schedule attached.
        </P>

        <H2>The obvious fix, and why we tested it</H2>
        <P>
          The standards have an answer: an <strong>archive timestamp</strong>. Apply a fresh timestamp over the whole
          document, and its newer certificate carries the proof forward.
        </P>
        <P>
          That is what PAdES-LTA is for, and the library we use exposes it. So we ran it, against two authorities, on a
          real sealed document.
        </P>
        <P>
          It worked, mechanically. The timestamp count went from one to two. The archive timestamp landed correctly.
          Nothing broke.
        </P>
        <P>And the horizon did not move.</P>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4 font-semibold text-slate-900">Archive timestamp applied by</th>
                <th className="py-2 pr-4 font-semibold text-slate-900">Its certificate expires</th>
                <th className="py-2 font-semibold text-slate-900">Change</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Sectigo</td>
                <td className="py-2 pr-4">2037-06-24</td>
                <td className="py-2 font-semibold text-slate-900">0 days</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Our own authority (EuroTSA)</td>
                <td className="py-2 pr-4">2036-08-09</td>
                <td className="py-2 font-semibold text-slate-900">319 days earlier</td>
              </tr>
            </tbody>
          </table>
        </div>

        <P>
          One of them made it <em>worse</em>.
        </P>

        <H2>Why</H2>
        <P>
          Because the archiving authority&rsquo;s certificate expires at roughly the same time as the original one.
          Everybody&rsquo;s does. Public timestamp authorities issue certificates on similar cycles, so the new proof
          inherits approximately the old horizon — or, if you happen to pick an authority whose certificate is younger,
          a shorter one.
        </P>
        <P>
          This is not a bug in the library. It is how the mechanism actually works, and it is easy to misread. Applying
          an archive timestamp once, ticking the box, and believing the problem is solved is a mistake we were on
          course to make ourselves.
        </P>
        <P>
          The horizon only extends through <strong>repeated</strong> re-timestamping: each new timestamp applied while
          the previous one is still valid, indefinitely, for as long as the document needs to stay provable. Miss a
          window and the chain is broken — and unlike most maintenance, you cannot fix it retroactively.
        </P>
        <P>
          The consequence is uncomfortable. The thing that keeps a document provable is not a cryptographic operation.
          It is <strong>someone reliably remembering, for years, to perform one</strong>. That is a process, not a
          feature, and no library call substitutes for it.
        </P>

        <H2>Check your own</H2>
        <P>
          We built a page that reads any signed or timestamped PDF and tells you, among other things, that date.
        </P>
        <P>
          It runs entirely in your browser. The file is not uploaded — it is not sent anywhere, including to us, and
          the page is served under a Content-Security-Policy that makes network requests impossible rather than merely
          absent. Save it with ⌘S and it works offline, forever, with no internet and nobody&rsquo;s servers.
        </P>
        <P>
          Drop in something you signed. The line you want begins <em>&ldquo;Provable until…&rdquo;</em>.
        </P>
        <a
          href="https://verifiedby.dev"
          className={`${buttonVariants({ size: "lg" })} mt-6`}
          rel="noopener"
        >
          Check a document at verifiedby.dev →
        </a>

        <H2>Checking the tool</H2>
        <P>
          A verification tool asking to be trusted is a contradiction, so: the source is at{" "}
          <a
            href="https://github.com/signedbyai/verifiedby"
            className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
            rel="noopener"
          >
            github.com/signedbyai/verifiedby
          </a>
          , Apache-2.0. It is one file, small enough to read.
        </P>
        <P>
          Publishing source for a hosted page proves nothing on its own — nothing forces the served bytes to match the
          published code. So confirm they do:
        </P>
        <Code>{`curl -s https://verifiedby.dev | shasum -a 256
node build.mjs && shasum -a 256 index.html`}</Code>
        <P>
          Those must match, and a CI job checks the same thing daily, in public. The rubric is published too: what is
          checked, in what order, what each verdict means, and what would have to be true for each to be{" "}
          <strong>wrong</strong>. A tool that only documents its strengths is marketing.
        </P>

        <H2>Method</H2>
        <P>
          The test ran against a real sealed PDF, trying two timestamp authorities in turn. Results were corroborated
          independently with pyHanko and asn1crypto rather than trusting our own output — worth doing, because both
          runs produced identical file sizes and the same generation time to the second, which looks like a copy until
          you check. It is not: the signature placeholder is fixed-width, and the requests landed in the same second.
        </P>
        <P>Certificate expiries were read from the embedded certificates, not inferred.</P>

        <H2>What we are not claiming</H2>
        <P>
          The 2037 date is not a countdown to disaster. The seal is valid today, trusted by Adobe&rsquo;s own trust
          list, and self-verifying. Eleven years is adequate for most commercial documents, and if yours are among them
          this is not urgent.
        </P>
        <P>
          We are also not claiming other vendors are careless. The document we checked was signed competently, using
          two qualified providers, and its horizon is finite for exactly the same structural reason ours is.{" "}
          <strong>Nobody in this market has solved it.</strong> That is the point.
        </P>
        <P>
          Nor does this tool fix anything. It tells you a date. What to do about that date is a separate question, and
          an honest one to sit with rather than answer quickly.
        </P>

        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-600">
            I run SignedBy, an e-signature company. I say so plainly, because the argument here does not depend on
            trusting us: the tool runs on your machine, talks to nothing, and its source is in front of you. Check it
            rather than believe me — that is the entire design. We found this in our own documents first, and our own
            horizon is 2037-06-24 like everybody else&rsquo;s.
          </p>
        </div>
      </article>
    </main>
  );
}
