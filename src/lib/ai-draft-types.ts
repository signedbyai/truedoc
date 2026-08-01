// Shared between the client (the "describe it" form) and the server
// (draft-document.ts's prompt-building) — pure data/strings, no Anthropic
// SDK or other server-only imports, so it's safe in either bundle.

import { SUMMARY_LANGUAGES } from "@/lib/summary-languages";

export type DraftDocumentType =
  | "freelance"
  | "nda"
  | "waiver"
  | "boiler_maintenance"
  | "bike_rental"
  | "board_resolution"
  | "general";

// `en` is required as the fallback; other draft-language codes are optional
// overrides. Every template's `labels`/`placeholders` is fully translated
// into all 7 draft languages (not just an English default) — both the
// document-type name shown in the dropdown and the example text in the
// description box should read naturally in whichever language the sender
// has picked, currency example included (a Freelance placeholder in French
// shows euros, not dollars). See documentTypeLabel/documentTypePlaceholder
// below for how these are looked up.
type Localized = { en: string } & Partial<Record<string, string>>;

export const DOCUMENT_TYPES: { id: DraftDocumentType; labels: Localized; placeholders: Localized }[] = [
  {
    id: "freelance",
    labels: {
      en: "Freelance / Services Agreement",
      es: "Contrato de Servicios / Freelance",
      fr: "Contrat de Prestation de Services / Freelance",
      de: "Freelancer-/Dienstleistungsvertrag",
      pt: "Contrato de Prestação de Serviços / Freelance",
      nl: "Freelance-/Dienstverleningsovereenkomst",
      it: "Contratto di Collaborazione / Freelance",
    },
    placeholders: {
      en: "e.g. 3-month logo design project, $2,000 total, net-30, client owns final files",
      es: "ej. proyecto de diseño de logotipo de 3 meses, €2.000 en total, pago a 30 días, el cliente es dueño de los archivos finales",
      fr: "ex. projet de conception de logo de 3 mois, 2 000 € au total, paiement à 30 jours, le client est propriétaire des fichiers finaux",
      de: "z. B. 3-monatiges Logo-Design-Projekt, insgesamt 2.000 €, Zahlungsziel 30 Tage, Kunde erhält die finalen Dateien",
      pt: "ex. projeto de design de logotipo de 3 meses, €2.000 no total, pagamento em 30 dias, cliente fica com os arquivos finais",
      nl: "bijv. 3 maanden durend logo-ontwerpproject, €2.000 in totaal, 30 dagen betaaltermijn, klant krijgt de definitieve bestanden",
      it: "es. progetto di logo design di 3 mesi, 2.000 € totali, pagamento a 30 giorni, il cliente ottiene i file definitivi",
    },
  },
  {
    id: "nda",
    labels: {
      en: "Non-Disclosure Agreement (NDA)",
      es: "Acuerdo de Confidencialidad (NDA)",
      fr: "Accord de Confidentialité (NDA)",
      de: "Geheimhaltungsvereinbarung (NDA)",
      pt: "Acordo de Confidencialidade (NDA)",
      nl: "Geheimhoudingsovereenkomst (NDA)",
      it: "Accordo di Riservatezza (NDA)",
    },
    placeholders: {
      en: "e.g. mutual NDA before discussing a potential partnership with another company",
      es: "ej. NDA mutuo antes de conversar sobre una posible colaboración con otra empresa",
      fr: "ex. NDA mutuel avant de discuter d'un partenariat potentiel avec une autre entreprise",
      de: "z. B. gegenseitige Geheimhaltungsvereinbarung vor Gesprächen über eine mögliche Partnerschaft mit einem anderen Unternehmen",
      pt: "ex. NDA mútuo antes de discutir uma possível parceria com outra empresa",
      nl: "bijv. wederzijdse geheimhoudingsovereenkomst voorafgaand aan een gesprek over een mogelijke samenwerking met een ander bedrijf",
      it: "es. NDA reciproco prima di discutere una possibile collaborazione con un'altra azienda",
    },
  },
  {
    id: "waiver",
    labels: {
      en: "Waiver / Release of Liability",
      es: "Exención de Responsabilidad",
      fr: "Décharge de Responsabilité",
      de: "Haftungsverzicht",
      pt: "Termo de Isenção de Responsabilidade",
      nl: "Vrijwaringsverklaring",
      it: "Liberatoria di Responsabilità",
    },
    placeholders: {
      en: "e.g. release form for participants in a one-day photography workshop",
      es: "ej. formulario de exención para los participantes de un taller de fotografía de un día",
      fr: "ex. décharge pour les participants à un atelier photo d'une journée",
      de: "z. B. Haftungsverzichtsformular für Teilnehmer eines eintägigen Fotografie-Workshops",
      pt: "ex. termo de isenção para participantes de uma oficina de fotografia de um dia",
      nl: "bijv. vrijwaringsformulier voor deelnemers aan een eendaagse fotografieworkshop",
      it: "es. modulo di liberatoria per i partecipanti a un workshop fotografico di un giorno",
    },
  },
  {
    id: "boiler_maintenance",
    labels: {
      en: "Boiler Maintenance Agreement",
      es: "Contrato de Mantenimiento de Caldera",
      fr: "Contrat d'Entretien de Chaudière",
      de: "Wartungsvertrag für Heizkessel",
      pt: "Contrato de Manutenção de Caldeira",
      // Dutch trade term (CV = "centrale verwarming", i.e. a boiler) reads
      // more naturally than a literal translation — this is the one this
      // whole localized-labels system was originally built for.
      nl: "CV-onderhoudscontract",
      it: "Contratto di Manutenzione Caldaia",
    },
    placeholders: {
      en: "e.g. annual boiler service contract, one inspection per year plus emergency call-outs, $180/year",
      es: "ej. contrato anual de mantenimiento de caldera, una revisión al año más avisos de urgencia, €180/año",
      fr: "ex. contrat annuel d'entretien de chaudière, une visite par an plus les interventions d'urgence, 180 €/an",
      de: "z. B. jährlicher Wartungsvertrag für die Heizung, eine Inspektion pro Jahr plus Notfalleinsätze, 180 €/Jahr",
      pt: "ex. contrato anual de manutenção de caldeira, uma inspeção por ano mais chamadas de emergência, €180/ano",
      nl: "bijv. jaarlijks onderhoudscontract voor de CV-ketel, één inspectie per jaar plus storingsdienst, €180/jaar",
      it: "es. contratto annuale di manutenzione caldaia, un controllo all'anno più interventi d'emergenza, 180 €/anno",
    },
  },
  {
    id: "bike_rental",
    labels: {
      en: "Bicycle Rental Agreement",
      es: "Contrato de Alquiler de Bicicletas",
      fr: "Contrat de Location de Vélo",
      de: "Fahrradverleihvertrag",
      pt: "Contrato de Aluguel de Bicicleta",
      // Dutch "fiets" (bicycle) — same reasoning as boiler_maintenance's "CV" above.
      nl: "Fietsverhuurovereenkomst",
      it: "Contratto di Noleggio Bici",
    },
    placeholders: {
      en: "e.g. weekend bicycle rental, $50 refundable deposit, renter liable for damage or theft",
      es: "ej. alquiler de bicicleta de fin de semana, depósito reembolsable de €50, el arrendatario responde por daños o robo",
      fr: "ex. location de vélo pour le week-end, caution remboursable de 50 €, le locataire est responsable des dommages ou du vol",
      de: "z. B. Fahrradverleih übers Wochenende, rückzahlbare Kaution von 50 €, Mieter haftet für Schäden oder Diebstahl",
      pt: "ex. aluguel de bicicleta de fim de semana, caução reembolsável de €50, locatário responsável por danos ou roubo",
      nl: "bijv. fietsverhuur voor het weekend, terugbetaalbare borg van €50, huurder aansprakelijk voor schade of diefstal",
      it: "es. noleggio bici per il weekend, cauzione rimborsabile di 50 €, il noleggiatore risponde di danni o furto",
    },
  },
  {
    id: "board_resolution",
    labels: {
      en: "Board Resolution / Written Consent",
      es: "Resolución del Consejo / Consentimiento por Escrito",
      fr: "Résolution du Conseil / Consentement Écrit",
      de: "Vorstandsbeschluss / Schriftliche Zustimmung",
      pt: "Resolução do Conselho / Consentimento por Escrito",
      nl: "Bestuursbesluit / Schriftelijke Toestemming",
      it: "Delibera del Consiglio / Consenso Scritto",
    },
    placeholders: {
      en: "e.g. unanimous written consent to open a business bank account, 3 directors, effective immediately",
      es: "ej. consentimiento unánime por escrito para abrir una cuenta bancaria empresarial, 3 directores, con efecto inmediato",
      fr: "ex. consentement écrit unanime pour ouvrir un compte bancaire professionnel, 3 administrateurs, effet immédiat",
      de: "z. B. einstimmige schriftliche Zustimmung zur Eröffnung eines Geschäftskontos, 3 Vorstandsmitglieder, sofort wirksam",
      pt: "ex. consentimento unânime por escrito para abrir uma conta bancária empresarial, 3 diretores, com efeito imediato",
      nl: "bijv. eenparige schriftelijke toestemming om een zakelijke bankrekening te openen, 3 bestuurders, met onmiddellijke ingang",
      it: "es. consenso scritto unanime per aprire un conto bancario aziendale, 3 amministratori, con effetto immediato",
    },
  },
  {
    // Kept last in the list on purpose — it's the catch-all/fallback type,
    // so every more-specific template above it should get first look.
    id: "general",
    labels: {
      en: "General Agreement",
      es: "Acuerdo General",
      fr: "Accord Général",
      de: "Allgemeine Vereinbarung",
      pt: "Acordo Geral",
      nl: "Algemene Overeenkomst",
      it: "Accordo Generale",
    },
    placeholders: {
      en: "e.g. a simple agreement for a one-time equipment rental between two small businesses",
      es: "ej. un acuerdo sencillo para el alquiler puntual de un equipo entre dos pequeñas empresas",
      fr: "ex. un accord simple pour la location ponctuelle d'un équipement entre deux petites entreprises",
      de: "z. B. eine einfache Vereinbarung für eine einmalige Geräte-Vermietung zwischen zwei kleinen Unternehmen",
      pt: "ex. um acordo simples para o aluguel pontual de um equipamento entre duas pequenas empresas",
      nl: "bijv. een eenvoudige overeenkomst voor eenmalige verhuur van apparatuur tussen twee kleine bedrijven",
      it: "es. un accordo semplice per il noleggio occasionale di un'attrezzatura tra due piccole imprese",
    },
  },
];

// Shown before drafting, and re-affirmed (via the required checkbox) every
// time — this is the load-bearing legal-risk mitigation for this whole
// feature (see product_backlog.md's "AI-drafted documents" entry: "the real
// cost is liability framing, not build cost"). Deliberately mirrors how
// Rocket Lawyer/LawDepot frame their own template generators: plain
// starting point, not a substitute for an attorney, and the sender stays
// responsible for reviewing it. Kept as one exported string so the
// generate-step UI and the finalize-step UI both show identical wording.
export const AI_DRAFT_DISCLAIMER =
  "This drafts a starting document based on what you describe — it is not legal advice, and SignedBy is not a " +
  "law firm or a substitute for one. Read the draft carefully and edit anything that doesn't match your situation " +
  "before sending it. For high-stakes, unusual, or high-value agreements, have a licensed attorney review it " +
  "first. You're responsible for the document you ultimately send.";

export const AI_DRAFT_CHECKBOX_LABEL =
  "I understand this is an AI-generated starting draft, not legal advice, and I'm responsible for reviewing it " +
  "before sending.";

// A curated *subset* of SUMMARY_LANGUAGES (see summary-languages.ts) — not
// the full list. Reason: a draft's title/body get rendered into a real PDF
// by text-to-pdf.ts using pdf-lib's built-in Helvetica standard font, which
// only supports the WinAnsi (Windows-1252) character set. Western European
// Latin script (this list) fits inside that; Polish's diacritics (ą ć ę ł
// ń ó ś ź ż) fall outside WinAnsi, and Chinese/Arabic/Hindi/Japanese aren't
// Latin-script at all. Requesting one of those would make pdf-lib throw a
// WinAnsi-encoding error inside textToPdf(), which the finalize route would
// surface as a generic "Couldn't create the PDF" failure — after the
// sender already reviewed a draft, which is a worse failure mode than not
// offering the option at all. If text-to-pdf.ts ever gains real Unicode
// font embedding (fontkit + bundled fonts, RTL shaping for Arabic,
// CJK-aware word wrap), this list can grow to match SUMMARY_LANGUAGES.
const DRAFT_LANGUAGE_CODES = ["en", "es", "fr", "de", "pt", "nl", "it"];

export const DRAFT_LANGUAGES: { code: string; label: string }[] = SUMMARY_LANGUAGES.filter((l) =>
  DRAFT_LANGUAGE_CODES.includes(l.code)
);

const DRAFT_LANG_CODES = new Set(DRAFT_LANGUAGES.map((l) => l.code));

export function isSupportedDraftLang(code: string): boolean {
  return DRAFT_LANG_CODES.has(code);
}

export function draftLanguageLabel(code: string): string {
  return DRAFT_LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}

// Same locale → code mapping as detectSummaryLang, but clamped to the
// narrower draft-safe set above (e.g. a Chinese browser locale falls back
// to English here even though the summary feature would honor it).
export function detectDraftLang(locale: string | undefined | null): string {
  if (!locale) return "en";
  const primary = locale.split("-")[0].toLowerCase();
  return isSupportedDraftLang(primary) ? primary : "en";
}

// languageCode is optional — an unsupported/missing code (stale client,
// direct API call, or simply not passed by an older caller) falls back to
// the English label/placeholder, same defensive precedent as
// draftLanguageLabel. Every DOCUMENT_TYPES entry defines all 7 draft
// languages, so in practice this is just a lookup, not a partial-coverage
// fallback.
export function documentTypeLabel(id: string, languageCode?: string): string {
  const type = DOCUMENT_TYPES.find((t) => t.id === id);
  if (!type) return "Document";
  const lang = languageCode && isSupportedDraftLang(languageCode) ? languageCode : "en";
  return type.labels[lang] ?? type.labels.en;
}

export function documentTypePlaceholder(id: string, languageCode?: string): string {
  const type = DOCUMENT_TYPES.find((t) => t.id === id);
  if (!type) return "";
  const lang = languageCode && isSupportedDraftLang(languageCode) ? languageCode : "en";
  return type.placeholders[lang] ?? type.placeholders.en;
}
