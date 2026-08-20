"use client";
// Required: TABS_ES below embeds lucide-react icon COMPONENTS (Icon:
// Signature/ShieldCheck/Receipt/Sparkles), and passes that array as the
// `tabs` prop into InteractiveProductTabsG (a client component). Server
// Components can't serialize a function/component reference across the
// RSC boundary — without this directive, Next.js throws "Functions cannot
// be passed directly to Client Components" and the page 500s (caught
// live 2026-08-20, see [[site-localization-spanish-build-2026-08-20]]).
// homepage-preview-g.tsx avoids this because its own TABS array is
// defined inside the client-only tabs file itself and never crosses the
// boundary as a prop value.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CtaLink } from "@/components/cta-link";
import { formatPrice, type Currency } from "@/lib/currency";
import { InteractiveProductTabsG, type ProductTab } from "@/components/homepage-preview-g-tabs";
import { Signature, ShieldCheck, Receipt, Sparkles } from "lucide-react";

// Spanish (Rioplatense/Argentina) homepage variant — built 2026-08-20 for
// the local-language growth test scoped in [[site-localization-scope-2026-08-20]].
// Michael's objective: find out whether a local-language ad + landing page +
// CTA produces more signups than the English homepage, Spanish/Argentina
// first since that's the market with the real traffic signal to test
// against (Dutch would mostly be a credibility play, not a conversion test).
//
// This is a translated COPY of homepage-preview-g.tsx, not a shared/i18n'd
// component — deliberate for a fast, cheap, reversible test (see the scope
// doc's Phase 1/2/3 framing). If Spanish wins and this gets built out
// properly, this file becomes the first casualty of that real i18n work,
// not something to maintain in parallel with the English variant forever.
//
// Known, accepted limitation of this test-phase build: the actual product
// screenshots (Sign/Seal/Quote/Draft tab images below) still show the
// English app UI — full UI translation is out of scope for this pass, see
// the scope doc's "dashboard app deferred" note. Everything else on this
// page — hero, comparison, pricing, FAQ — is real Spanish copy, not
// machine-translated placeholder text.
//
// Tagline: uses the new simplified tagline Michael picked, after several
// rounds of options ("eSignature essentials", "without the extras", "sin
// vueltas" as-is, etc.) — final pick 2026-08-20: "eSignatures, without the
// runaround" in English, rather than translating the EN homepage's "per-seat
// tax" line, which leans on an English SaaS idiom that doesn't carry over.
// Spanish version: "Firmas electrónicas, sin vueltas" — unchanged from the
// prior "without the extras" pick, since "sin vueltas" (idiomatic Rioplatense
// for "no runaround/no fuss/straight to the point") already matches "without
// the runaround" at least as well as it matched the phrase it was drafted
// against, if not better.

const DOCUSIGN_COMPARISON = [
  { label: "Plan pago más barato", signedby: "$7/mes fijo", competitor: "$10-15/mes, 1 usuario" },
  { label: "3 usuarios", signedby: "$14/mes total (Equipo)", competitor: "$75-195/mes total, con precio por usuario" },
];

const FAQS = [
  {
    q: "¿Hay un plan gratuito?",
    a: "Sí — el plan Free incluye 3 documentos por mes para 1 usuario, sin necesidad de tarjeta de crédito.",
  },
  {
    q: "¿Puedo firmar mis propios documentos sin enviárselos a nadie?",
    a: "Sí. Con Seal podés autofirmar y sellar un documento con un sello con marca de tiempo confiable RFC 3161 e identidad verificada — sin necesidad de destinatario.",
  },
  {
    q: "¿Dónde se almacenan mis datos?",
    a: "En la UE. SignedBy cumple con el RGPD y aloja los datos en el EEE.",
  },
  {
    q: "¿Usan mis documentos para entrenar modelos de IA?",
    a: "No — la IA de SignedBy nunca entrena con tus documentos.",
  },
];

// Same VALUE_PROPS icons/paths as the English homepage (src/lib/homepage-content.ts),
// kept local here with translated labels rather than adding a language
// branch to the shared file — see this file's own top comment on why this
// stays a standalone copy for now.
const VALUE_PROPS: { label: string; path: string }[] = [
  { label: "Enviá más rápido", path: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { label: "Seguí el progreso", path: "M3 12h4l3 8 4-16 3 8h4" },
  { label: "Controlá el acceso", path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { label: "Cerrá acuerdos", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12l2 2 4-4" },
];

// Plan tier names (Free/Pro/Team/Business) deliberately kept in English —
// they're the actual account plan identifiers used across Stripe and the
// (still English-only) dashboard, so translating just the display name here
// would create a mismatch the moment someone signs up. Only the blurbs are
// translated.
const PRICING_ES: { name: string; id: "free" | "starter" | "team" | "business"; blurb: string }[] = [
  { name: "Free", id: "free", blurb: "3 documentos/mes, 1 usuario" },
  { name: "Pro", id: "starter", blurb: "Documentos ilimitados, 1 usuario" },
  { name: "Team", id: "team", blurb: "Hasta 3 usuarios, marca personalizada" },
  { name: "Business", id: "business", blurb: "Hasta 5 usuarios, acceso a la API" },
];

const TABS_ES: ProductTab[] = [
  {
    key: "sign",
    title: "Firmar",
    description: "Agregá campos de firma, iniciales, fecha y texto en cualquier PDF, y envialo para firmar en segundos.",
    image: "/hero-sign-mobile-composite.png",
    alt: "El editor de campos de SignedBy con la pantalla de firma móvil superpuesta, mostrando el control de deslizar para firmar",
    width: 1642,
    height: 1070,
    objectPosition: "right top",
    Icon: Signature,
  },
  {
    key: "seal",
    title: "Sellar",
    description:
      "Autofirmá y sellá un documento con un sello con marca de tiempo confiable RFC 3161 e identidad verificada — sin necesidad de destinatario.",
    image: "/hero-verified-badge-invoice-d.png",
    alt: "Una factura con la medalla de Verificado y Sellado de SignedBy estampada en la esquina superior derecha",
    width: 740,
    height: 650,
    objectPosition: "right top",
    Icon: ShieldCheck,
  },
  {
    key: "quote",
    title: "Presupuesto",
    description: "Describí el trabajo en lenguaje simple y Magic Quote lo convierte en un presupuesto detallado, listo para firmar.",
    image: "/hero-magic-quote.png",
    alt: "El editor de presupuestos de Magic Quote: título, moneda, cliente y renglones con totales calculados",
    width: 568,
    height: 483,
    objectPosition: "center top",
    Icon: Receipt,
  },
  {
    key: "draft",
    title: "Redactar",
    description: "Describí lo que necesitás y la IA redacta un acuerdo listo para enviar — revisalo, editalo y envialo en el mismo paso.",
    image: "/hero-new-document-draft.png",
    alt: "La pestaña Redactar: selectores de tipo de documento e idioma, una descripción en lenguaje simple y un botón para generar el borrador",
    width: 567,
    height: 513,
    objectPosition: "center top",
    Icon: Sparkles,
  },
];

export function HomepageEs({ currency }: { currency: Currency }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Image
          src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png"
          alt="SignedBy"
          width={266}
          height={64}
          className="h-7 w-auto"
          priority
        />
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Iniciar sesión
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 sm:grid-cols-2 sm:items-start sm:pt-16">
        <div className="text-center sm:text-left">
          <Link
            href="/vs/docusign"
            className="mb-6 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 sm:text-sm"
          >
            <span className="hidden sm:inline">Los equipos ahorran</span>
            <span className="sm:hidden">Ahorrá</span>
            <span className="font-bold text-yellow-300">$700+/año</span>
            <span>vs DocuSign</span>
            <span className="hidden sm:inline">— mirá los números</span>
            <span aria-hidden>→</span>
          </Link>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            <span className="whitespace-nowrap border-b-[5px] border-yellow-300 pb-0.5">Firmas electrónicas</span>, sin
            vueltas
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-slate-600 sm:mx-0 sm:max-w-sm sm:text-xl">
            SignedBy es una alternativa rápida y accesible para firmar electrónicamente — pensada para
            profesionales independientes y equipos chicos que firman algunos documentos por mes, no para un piso
            de ventas entero.
          </p>
          <div className="mt-9 flex flex-col items-center sm:items-start">
            <CtaLink
              href="/login?intent=signup&utm_source=homepage_es&utm_medium=cta&utm_campaign=homepage_page_es&utm_content=preview-g-es"
              color="purple"
              page="homepage-es"
              position="hero"
              variant="es"
            >
              Empezá gratis →
            </CtaLink>
            <p className="mt-3 text-xs text-slate-400">No necesitás tarjeta de crédito — 3 documentos gratis por mes.</p>
          </div>
        </div>

        <InteractiveProductTabsG tabs={TABS_ES} />
      </section>

      {/* Value row — same VALUE_PROPS icons the English variant uses, translated labels. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-8">
        <div className="grid w-full max-w-xl grid-cols-4 gap-2 border-y border-slate-100 py-4 sm:gap-4 sm:py-5">
          {VALUE_PROPS.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-300 text-slate-900 sm:h-8 sm:w-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  aria-hidden
                >
                  <path d={v.path} />
                </svg>
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-700 sm:text-xs">{v.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">La diferencia real de costo</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-3 sm:px-6">
            <span></span>
            <span className="text-center">SignedBy</span>
            <span className="text-center">DocuSign</span>
          </div>
          {DOCUSIGN_COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col gap-2.5 px-4 py-4 text-sm sm:grid sm:grid-cols-3 sm:items-center sm:gap-0 sm:px-6 ${i > 0 ? "border-t border-slate-100" : ""}`}
            >
              <span className="font-semibold text-slate-900 sm:font-normal sm:text-slate-600">{row.label}</span>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">SignedBy</span>
                <span className="flex-1 text-right font-semibold text-slate-900 sm:text-center">{row.signedby}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:block sm:text-center">
                <span className="shrink-0 text-xs font-medium text-slate-400 sm:hidden">DocuSign</span>
                <span className="flex-1 text-right text-slate-500 sm:text-center">{row.competitor}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center">
          <Link href="/vs/docusign" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Ver la comparación completa →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
          <div className="text-center sm:text-left">
            <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
              <Image
                src="/brand/signedby-badge-black-small.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg"
              />
              <h2 className="text-lg font-semibold text-slate-900">Conectá tu CRM</h2>
            </div>
            <p className="mx-auto max-w-sm text-slate-600 sm:mx-0 sm:max-w-none">
              Una API REST y webhooks salientes — creá y enviá documentos desde tu CRM, consultá el estado o
              recibí una notificación apenas se firme algo.
            </p>
            <Link
              href="/developers"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              Mirá la documentación de la API <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 font-mono text-xs leading-relaxed text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.25)]">
            <div className="text-slate-500">POST /api/v1/documents</div>
            <div className="mt-2 text-sky-300">
              {"{"}
              <div className="pl-4">
                <span className="text-sky-300">&quot;title&quot;</span>
                <span className="text-slate-500">: </span>
                <span className="text-emerald-300">&quot;Freelance Agreement&quot;</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-sky-300">&quot;signers&quot;</span>
                <span className="text-slate-500">: [&quot;jane@acme.com&quot;]</span>
              </div>
              {"}"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Confían en nosotros</p>
        <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-logo-marquee flex w-max items-center gap-12">
            {[...TRUSTED_BY_ES, ...TRUSTED_BY_ES].map((logo, i) => (
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
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            Empresa con sede en la UE
          </span>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Cumple con el RGPD · Datos alojados en el EEE
          </Link>
          <Link
            href="/security"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            La IA nunca entrena con tus documentos
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Precios simples</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRICING_ES.map((p) => (
            <Card key={p.name} className="text-center">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPrice(currency, p.id, { withPeriod: true })}
                </p>
                <p className="mt-2 text-xs text-slate-500">{p.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Ver todos los detalles de los planes →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900">Preguntas</h2>
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQS.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <p className="font-semibold text-slate-900">{f.q}</p>
              <p className="mt-1 text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// Same real early-customer logos as the English homepage (src/lib/homepage-content.ts) —
// company names are proper nouns, nothing to translate.
const TRUSTED_BY_ES = [
  { name: "SyncMint", src: "/logos/syncmint.png", height: "h-8" },
  { name: "AlphaIndigo", src: "/logos/alphaindigo.png", height: "h-5" },
  { name: "Studio Vider", src: "/logos/studio-vider.png", height: "h-5" },
];
