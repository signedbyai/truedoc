import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cta-link";

// Local-language (IT) translation of /verified-badge-invoices/guide
// — 2026-08-22, direct ask, once the locale invoice pages (/it/verified-badge-invoices
// etc.) were built but their own "read the guide" link still pointed at the
// English-only guide. Same content and structure as the English source
// (src/app/verified-badge-invoices/guide/page.tsx), translated. Two
// deliberate differences from the English page: this uses a fixed
// color="purple" CTA instead of the live ctaColorFlag() A/B test (same
// simplification the other locale pages already made — "tests LANGUAGE,
// not CTA copy"), and the step screenshots are the same English-UI images
// as every other locale page's product screenshots (known, accepted
// limitation — full dashboard UI translation is out of scope for this
// pass).
const TITLE = "Come sigillare le fatture con Verified Badge — Guida | SignedBy";
const DESCRIPTION =
  "Passo dopo passo: verifica la tua identità una volta, poi sigilla e contrassegna ogni fattura che invii da quel momento — cosa vedi tu, e cosa vede il tuo cliente quando la scansiona.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/it/verified-badge-invoices/guide" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/it/verified-badge-invoices/guide" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SIGNUP_HREF =
  "/login?intent=signup&next=" +
  encodeURIComponent("/dashboard/documents/new?mode=badge") +
  "&utm_source=verified_badge_invoice_guide_it&utm_medium=cta&utm_campaign=verified_badge_invoice_page_it";

type GuideStep = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  body: string;
};

const SETUP_STEPS: GuideStep[] = [
  {
    title: "Apri la scheda Verified Badge",
    image: "/guide-badge-invoice-start-badge-tab.png",
    imageWidth: 1170,
    imageHeight: 1200,
    body: "Dashboard → Nuovo documento → scheda Verified Badge. È un percorso separato dalla scheda Firma — nessun destinatario da aggiungere, niente da firmare, solo un file da sigillare.",
  },
  {
    title: "Scegli il PDF della fattura",
    image: "/guide-badge-invoice-upload-first-invoice.png",
    imageWidth: 1170,
    imageHeight: 1000,
    body: "Solo PDF. Se la tua fattura esce dal software di contabilità in un altro formato, esportala o stampala prima in PDF. Dalle un titolo, poi premi Sigilla questo file.",
  },
  {
    title: "Verifica la tua identità (una volta)",
    image: "/guide-badge-invoice-verify-identity.png",
    imageWidth: 1170,
    imageHeight: 650,
    body: "Il tuo primissimo sigillo richiede un controllo del documento d'identità, ospitato da Stripe e di solito completato in meno di un minuto. Ogni sigillo successivo lo riutilizza automaticamente — non vedrai più questa schermata.",
  },
  {
    title: "Sei sigillato",
    image: "/guide-badge-invoice-sealed-first.png",
    imageWidth: 1170,
    imageHeight: 700,
    body: "SignedBy calcola l'hash del file, lo marca temporalmente con una vera Autorità di Marcatura Temporale (Sectigo, con EuroTSA e poi FreeTSA come fallback automatici), e genera il tuo badge — poi ti porta direttamente sulla pagina del documento.",
  },
];

const FLOW_STEPS: GuideStep[] = [
  {
    title: "Sigilla la fattura successiva",
    image: "/guide-badge-invoice-seal-next-invoice.png",
    imageWidth: 1170,
    imageHeight: 950,
    body: "Stessa scheda, stessi due passaggi — scegli il file, premi Sigilla questo file. Questa volta niente controllo d'identità; è un costo una tantum, non per fattura.",
  },
  {
    title: "I tuoi output sono pronti",
    image: "/guide-badge-invoice-outputs-ready.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "Ogni sigillo ti dà un'immagine Badge, un PDF sigillato, un Certificato e una copia/QR del link di verifica — tutto sulla pagina del documento nella tua dashboard. Per una fattura, l'immagine Badge è quella da usare: un piccolo segno che inserisci direttamente nel file, niente altro da gestire.",
  },
  {
    title: "Applica il badge sulla tua fattura",
    image: "/hero-verified-badge-invoice.png",
    imageWidth: 640,
    imageHeight: 820,
    body: "Incolla l'immagine del badge in un angolo della tua fattura prima di inviarla — come un logo. Porta con sé il codice QR, il marchio SignedBy e un breve link di verifica in testo semplice, quindi resta credibile anche stampata o catturata in uno screenshot.",
  },
  {
    title: "Il tuo cliente lo scansiona",
    image: "/guide-badge-invoice-client-verifies.png",
    imageWidth: 1170,
    imageHeight: 780,
    body: "La sua fotocamera apre direttamente la pagina di verifica — nessuna app, nessun account. Conferma due fatti distinti: il file non è cambiato da quando è stato sigillato, e chi lo ha sigillato ha superato un vero controllo d'identità. È un modo reale di verificare, non solo fidarsi perché un'email sembra a posto.",
  },
];

export default function VerifiedBadgeInvoicesGuideItPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/it">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Accedi
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Per freelance e agenzie</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Guida alla sigillatura e all&apos;invio</h1>
        <p className="max-w-xl text-base text-slate-600">
          Due parti: verificare la tua identità una volta, e cosa succede davvero ogni volta che sigilli e invii una fattura dopo.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:gap-3 sm:text-sm">
          <Link
            href="#part-1"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              1
            </span>
            Verifica
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              2
            </span>
            Sigilla
          </Link>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
          <Link
            href="#part-2"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              3
            </span>
            Invia
          </Link>
        </div>

        <Image
          src="/hero-verified-badge-invoice.png"
          alt="Un Verified Badge applicato nell'angolo di una fattura da freelance — il marchio SignedBy, un codice QR scansionabile e un link di verifica"
          width={640}
          height={820}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 shadow-lg"
          priority
        />
        <Link href="/it/verified-badge-invoices" className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900">
          ← Torna a Verified Badge per le fatture
        </Link>
      </section>

      {/* Part 1 */}
      <section id="part-1" className="mx-auto w-full max-w-3xl px-6 pb-4 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Parte 1 — Verifica della tua identità (una sola volta)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Il tuo primissimo sigillo Verified Badge include una verifica d&apos;identità una tantum. Tutto il resto sono solo due clic.
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
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className="mx-auto mt-3 w-full rounded-lg border border-slate-200"
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Da sapere</h3>
          <p className="mt-2 text-sm text-slate-600">
            Il controllo d&apos;identità è a livello di organizzazione, non per documento — chiunque nel tuo team sigilli un documento in seguito riutilizza lo stesso controllo verificato, una volta fatto lui stesso. Il piano Free include 3 sigilli Verified Badge al mese; dal piano Pro in su la sigillatura è illimitata, senza costo per sigillo.
          </p>
        </div>
      </section>

      {/* Part 2 */}
      <section id="part-2" className="mx-auto w-full max-w-3xl px-6 py-10 scroll-mt-6">
        <h2 className="text-2xl font-semibold text-slate-900">Parte 2 — Sigillare e inviare una fattura, ogni volta</h2>
        <p className="mt-2 text-sm text-slate-600">Ecco cosa succede davvero una volta che sei verificato ed è il momento di inviare una fattura vera.</p>

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
                alt={step.title}
                width={step.imageWidth}
                height={step.imageHeight}
                className={`mx-auto mt-3 rounded-lg border border-slate-200 ${step.image.startsWith("/hero-") ? "w-full max-w-xs" : "w-full"}`}
              />
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Da sapere</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Un Verified Badge dimostra che la tua fattura è esistita, inalterata, a partire da una marca temporale verificata crittograficamente, sigillata da una persona con identità verificata — un&apos;affermazione reale e utile, diversa da «sembra legittima». Non impedisce a nessuno di falsificare un&apos;altra fattura, e non pretende di farlo.
            </li>
            <li>
              Preferisci lasciare il file originale completamente intatto? Usa il Certificato invece del badge — registra la stessa prova separatamente invece di timbrare il PDF stesso, il che di solito è più adatto a una dataroom che a una fattura che consegni a un singolo cliente.
            </li>
            <li>
              Puoi anche sigillare un file dalla chat di Console o dall&apos;API invece che dalla dashboard — consulta la{" "}
              <Link href="/developers" className="underline underline-offset-2 hover:text-slate-900">
                documentazione per sviluppatori
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Prova SignedBy gratis</h2>
        <p className="mt-2 text-sm text-slate-600">3 sigilli Verified Badge al mese, senza carta di credito, upgrade solo se ti serve di più.</p>
        <CtaLink href={SIGNUP_HREF} className="mt-5" color="purple" page="verified-badge-invoices-guide-it" position="footer" variant="it">
          Ottieni il tuo Verified Badge ora →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        <p className="mt-2 space-x-4">
          <Link href="/it/verified-badge-invoices" className="hover:text-slate-600">
            Verified Badge per le fatture
          </Link>
          <Link href="/templates" className="hover:text-slate-600">
            Modelli gratuiti
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
