import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Italian companion to /verified-badge-invoices — 2026-08-20. See
// src/app/es/verified-badge-invoices/page.tsx for the full rationale this
// mirrors (single fixed layout, no A-F CTA test).
const TITLE = "Verified Badge — dimostra che la tua fattura viene davvero da te, non da un falso generato dall'IA | SignedBy";
const DESCRIPTION =
  "Sigilla la tua fattura come inalterata e con identità verificata prima di inviarla. Il tuo cliente scansiona un codice e sa subito che viene da te. Gratis per iniziare, senza carta di credito.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/it/verified-badge-invoices" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/it/verified-badge-invoices" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const START_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_it&utm_medium=cta&utm_campaign=verified_badge_invoice_page_it";

const FAQ = [
  {
    q: "Questo impedisce a qualcuno di falsificare la mia fattura?",
    a: "No — e non è questo il suo scopo. Un Verified Badge dimostra che la tua vera fattura esisteva, inalterata, con un timestamp verificato crittograficamente, sigillata da una persona con identità verificata. Questo dà al tuo cliente un modo reale per verificare, invece di fidarsi solo dell'aspetto di un'email — non è una garanzia che non possa mai succedere nulla di grave.",
  },
  {
    q: "Cosa vede esattamente il cliente?",
    a: "Un badge sulla tua fattura — un codice QR, il logo SignedBy e un breve link di verifica in chiaro, che resta leggibile anche stampato o in uno screenshot. Scansionandolo o visitandolo si arriva a una pagina di registro pubblico: il tuo nome, la data in cui il file è stato sigillato e la conferma che non è stato modificato da allora. Nessun account o accesso richiesto per verificare.",
  },
  {
    q: "E se la mia verifica d'identità è vecchia?",
    a: "Il tuo primo sigillo verifica la tua identità tramite un controllo del documento (circa un minuto, tramite Stripe). I sigilli successivi riutilizzano quella stessa verifica invece di riscansionare il documento ogni volta — più economico e veloce. La pagina di registro mostra sempre \"identità verificata il [data]\" accanto a \"sigillato il [data]\" come due informazioni distinte, così è chiaro se la verifica dell'identità precede quel particolare sigillo.",
  },
  {
    q: "Funziona con file diversi dal PDF?",
    a: "Solo PDF per ora. Se la tua fattura proviene da un software di contabilità in un altro formato, esportala o stampala prima come PDF, poi sigilla quel file.",
  },
  {
    q: "Di quale piano ho bisogno?",
    a: "Qualsiasi piano, incluso Free, senza carta di credito. Free include 3 sigilli Verified Badge al mese. Il piano Pro o superiore consente sigilli illimitati, senza costi per sigillo. Sigilla un file direttamente dal menu Nuovo documento della tua dashboard — anche gli sviluppatori possono farlo dalla chat Console o dall'API, vedi la documentazione per sviluppatori.",
  },
  {
    q: "Cosa rende il timestamp davvero \"verificato crittograficamente\"?",
    a: "Ogni sigillo viene inviato a un'autorità di timestamping reale (il servizio pubblico RFC 3161 di Sectigo, con EuroTSA e poi FreeTSA come fallback automatico se Sectigo non è raggiungibile) che firma l'hash del file con l'ora. Questo può essere verificato in modo indipendente da chiunque, fidandosi solo dell'autorità di timestamping — non solo di una data nel database di SignedBy. La pagina di registro su signedby.ai/verify mostra quale autorità di timestamping ha convalidato un determinato sigillo.",
  },
];

export default function VerifiedBadgeInvoicesItPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/it">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Accedi
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Badge</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          L'IA può falsificare una fattura in pochi secondi. Dimostra che la tua viene davvero da te.{" "}
          <ShieldCheck className="inline-block h-6 w-6 -translate-y-0.5 text-slate-900 sm:h-7 sm:w-7" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Un truffatore può ormai creare in pochi secondi una fattura falsa convincente con il tuo nome e il
          tuo brand, e inviarla a uno dei tuoi clienti. Sigilla prima la tua fattura vera: un hash e una prova
          con identità verificata di ciò che hai effettivamente inviato, così il tuo cliente può verificare
          prima di pagare.
        </p>
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Metti al sicuro la tua fattura gratis
            <span
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-emerald-200 bg-emerald-50"
              aria-hidden="true"
            />
          </div>
          <CtaLink href={START_HREF} color="purple" page="verified-badge-invoices-it" position="hero" variant="it">
            Ottieni il tuo Verified Badge ora →
          </CtaLink>
          <p className="text-xs text-slate-400">Gratis per iniziare, senza carta di credito — circa un minuto per configurarlo.</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl justify-center px-6 pb-10">
        <div className="relative w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)]">
            <Image
              src="/hero-verified-badge-invoice.png"
              alt="Un Verified Badge apposto nell'angolo di una fattura freelance — il logo SignedBy, un codice QR scansionabile e un link di verifica"
              width={640}
              height={820}
              priority
              sizes="(max-width: 640px) 90vw, 384px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Come funziona</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1. Verificati una volta",
              body: "Una verifica d'identità una tantum (circa un minuto, tramite Stripe). Riutilizzata per ogni sigillo futuro — niente bisogno di riscansionare il documento ogni volta.",
            },
            {
              step: "2. Sigilla la fattura",
              body: "Carica semplicemente il PDF finale della tua fattura dalla dashboard — SignedBy lo sottopone a hash, lo marca temporalmente e genera il tuo badge.",
            },
            {
              step: "3. Aggiungi il badge",
              body: "Metti il badge sulla tua fattura prima di inviarla. Il cliente lo scansiona e arriva su una pagina di verifica pubblica — nessun account richiesto.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{s.step}</p>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/verified-badge-invoices/guide"
          className="mt-4 block rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400"
        >
          <h3 className="text-base font-semibold text-slate-900">Nuovo su SignedBy? Guarda la guida alla sigillatura e all'invio</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Passo dopo passo: verifica la tua identità una volta, e cosa succede esattamente ogni volta che
            sigilli e invii una fattura da quel momento in poi.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-2">
            Leggi la guida →
          </span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900">Cosa dimostra davvero</h2>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Un Verified Badge è una prova di provenienza e integrità, non uno strumento di rilevamento delle
          frodi. Conferma che questo file esatto esisteva, inalterato, con un timestamp verificato
          crittograficamente, sigillato da una persona con identità verificata — un'affermazione reale e
          utile, diversa da &laquo;&nbsp;sembra legittimo&nbsp;&raquo;. Un linguaggio volutamente onesto:
          esagerare qui indebolirebbe l'unica cosa che regge davvero a un controllo approfondito.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Metti al sicuro la tua fattura gratis</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gratis per iniziare — 3 sigilli al mese inclusi, senza carta di credito. Ti serve di più? Il piano
          Pro o superiore consente sigilli illimitati, senza costi per sigillo.
        </p>
        <CtaLink href={START_HREF} className="mt-5" color="purple" page="verified-badge-invoices-it" position="footer" variant="it">
          Ottieni il tuo Verified Badge ora →
        </CtaLink>
      </section>

      <section className="mx-auto w-full max-w-3xl pb-12 px-6">
        <h2 className="text-lg font-semibold text-slate-900">Domande frequenti</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQ.map((item) => (
            <div key={item.q} className="px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="text-sm text-slate-500">
          Anche su SignedBy:{" "}
          <Link href="/console" className="underline underline-offset-2 hover:text-slate-900">
            Console
          </Link>{" "}
          ·{" "}
          <Link href="/magic-quote" className="underline underline-offset-2 hover:text-slate-900">
            Magic Quote
          </Link>{" "}
          ·{" "}
          <Link href="/verify" className="underline underline-offset-2 hover:text-slate-900">
            Verifica un documento
          </Link>{" "}
          ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
            Documentazione API e MCP
          </Link>
        </p>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/verified-badge-invoices/guide" className="hover:text-slate-600">
            Guida alla sigillatura e all'invio
          </Link>
          <Link href="/pricing" className="hover:text-slate-600">
            Prezzi
          </Link>
          <Link href="/terms" className="hover:text-slate-600">
            Termini
          </Link>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
        </p>
      </footer>
    </main>
  );
}
