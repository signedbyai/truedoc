// Translated UI/PDF chrome for Magic Quote's language option (see
// MAGIC_QUOTE_LANGUAGE_SCOPE.md, project root — "full scope" decision,
// 2026-07-25). Shared between the client (magic-quote-form.tsx's review
// step) and the server (quote-to-pdf.ts's rendering) — pure data, no
// server-only imports, same split as ai-draft-types.ts vs draft-document.ts.
//
// Reuses ai-draft-types.ts's language set rather than defining a second one:
// quote-to-pdf.ts embeds the same pdf-lib Helvetica standard font as
// text-to-pdf.ts (confirmed before writing this file), so it's bound by the
// same WinAnsi character-set ceiling — see ai-draft-types.ts's
// DRAFT_LANGUAGE_CODES comment for why that's 7 Latin-script languages, not
// the full 12-language SUMMARY_LANGUAGES list.
import { DRAFT_LANGUAGES, isSupportedDraftLang } from "@/lib/ai-draft-types";

export { DRAFT_LANGUAGES as QUOTE_LANGUAGES, isSupportedDraftLang as isSupportedQuoteLang };

type Localized = { en: string } & Partial<Record<string, string>>;

// PDF chrome (quote-to-pdf.ts) and in-app review-step labels
// (magic-quote-form.tsx) share this one table — "Subtotal"/"Tax"/"Total"
// appear in both places and should read identically in either.
const QUOTE_LABELS = {
  from: { en: "From", es: "De", fr: "De", de: "Von", pt: "De", nl: "Van", it: "Da" },
  billTo: {
    en: "Bill to",
    es: "Facturar a",
    fr: "Facturer à",
    de: "Rechnung an",
    pt: "Faturar para",
    nl: "Factureren aan",
    it: "Fatturare a",
  },
  quoteDate: {
    en: "Quote date",
    es: "Fecha del presupuesto",
    fr: "Date du devis",
    de: "Angebotsdatum",
    pt: "Data do orçamento",
    nl: "Offertedatum",
    it: "Data del preventivo",
  },
  validUntil: {
    en: "Valid until",
    es: "Válido hasta",
    fr: "Valable jusqu'au",
    de: "Gültig bis",
    pt: "Válido até",
    nl: "Geldig tot",
    it: "Valido fino al",
  },
  description: {
    en: "Description",
    es: "Descripción",
    fr: "Description",
    de: "Beschreibung",
    pt: "Descrição",
    nl: "Omschrijving",
    it: "Descrizione",
  },
  qty: { en: "Qty", es: "Cant.", fr: "Qté", de: "Menge", pt: "Qtd.", nl: "Aantal", it: "Q.tà" },
  quantity: {
    en: "Quantity",
    es: "Cantidad",
    fr: "Quantité",
    de: "Menge",
    pt: "Quantidade",
    nl: "Aantal",
    it: "Quantità",
  },
  unitPrice: {
    en: "Unit price",
    es: "Precio unitario",
    fr: "Prix unitaire",
    de: "Einzelpreis",
    pt: "Preço unitário",
    nl: "Prijs per stuk",
    it: "Prezzo unitario",
  },
  amount: { en: "Amount", es: "Importe", fr: "Montant", de: "Betrag", pt: "Valor", nl: "Bedrag", it: "Importo" },
  subtotal: {
    en: "Subtotal",
    es: "Subtotal",
    fr: "Sous-total",
    de: "Zwischensumme",
    pt: "Subtotal",
    nl: "Subtotaal",
    it: "Subtotale",
  },
  tax: { en: "Tax", es: "Impuesto", fr: "Taxe", de: "Steuer", pt: "Imposto", nl: "Belasting", it: "Imposta" },
  total: { en: "Total", es: "Total", fr: "Total", de: "Gesamt", pt: "Total", nl: "Totaal", it: "Totale" },
  notes: { en: "Notes", es: "Notas", fr: "Remarques", de: "Anmerkungen", pt: "Notas", nl: "Opmerkingen", it: "Note" },
  clientAcceptance: {
    en: "Client acceptance",
    es: "Aceptación del cliente",
    fr: "Acceptation du client",
    de: "Kundenannahme",
    pt: "Aceitação do cliente",
    nl: "Aanvaarding door klant",
    it: "Accettazione del cliente",
  },
  signature: {
    en: "Signature:",
    es: "Firma:",
    fr: "Signature :",
    de: "Unterschrift:",
    pt: "Assinatura:",
    nl: "Handtekening:",
    it: "Firma:",
  },
  printName: {
    en: "Print Name:",
    es: "Nombre en letra de imprenta:",
    fr: "Nom en lettres capitales :",
    de: "Name in Druckbuchstaben:",
    pt: "Nome por extenso:",
    nl: "Naam in blokletters:",
    it: "Nome in stampatello:",
  },
  date: { en: "Date:", es: "Fecha:", fr: "Date :", de: "Datum:", pt: "Data:", nl: "Datum:", it: "Data:" },

  // Form-only (magic-quote-form.tsx)
  quoteTitle: {
    en: "Quote title",
    es: "Título del presupuesto",
    fr: "Titre du devis",
    de: "Angebotstitel",
    pt: "Título do orçamento",
    nl: "Offertetitel",
    it: "Titolo del preventivo",
  },
  currency: { en: "Currency", es: "Moneda", fr: "Devise", de: "Währung", pt: "Moeda", nl: "Valuta", it: "Valuta" },
  customerName: {
    en: "customer name",
    es: "nombre del cliente",
    fr: "nom du client",
    de: "Kundenname",
    pt: "nome do cliente",
    nl: "klantnaam",
    it: "nome del cliente",
  },
  customerEmail: {
    en: "Customer email",
    es: "Correo del cliente",
    fr: "E-mail du client",
    de: "Kunden-E-Mail",
    pt: "E-mail do cliente",
    nl: "E-mailadres klant",
    it: "Email del cliente",
  },
  optional: {
    en: "optional",
    es: "opcional",
    fr: "facultatif",
    de: "optional",
    pt: "opcional",
    nl: "optioneel",
    it: "facoltativo",
  },
  lineItems: {
    en: "Line items",
    es: "Partidas",
    fr: "Postes",
    de: "Positionen",
    pt: "Itens",
    nl: "Regelitems",
    it: "Voci",
  },
  taxRate: {
    en: "Tax rate",
    es: "Tasa de impuesto",
    fr: "Taux de taxe",
    de: "Steuersatz",
    pt: "Taxa de imposto",
    nl: "Belastingtarief",
    it: "Aliquota fiscale",
  },
  describeJob: {
    en: "Describe the job",
    es: "Describe el trabajo",
    fr: "Décrivez le travail",
    de: "Beschreibe den Auftrag",
    pt: "Descreva o serviço",
    nl: "Beschrijf de klus",
    it: "Descrivi il lavoro",
  },
  generateQuote: {
    en: "Generate quote",
    es: "Generar presupuesto",
    fr: "Générer le devis",
    de: "Angebot erstellen",
    pt: "Gerar orçamento",
    nl: "Offerte genereren",
    it: "Genera preventivo",
  },
  generatingQuote: {
    en: "Generating quote…",
    es: "Generando presupuesto…",
    fr: "Génération du devis…",
    de: "Angebot wird erstellt…",
    pt: "Gerando orçamento…",
    nl: "Offerte genereren…",
    it: "Generazione preventivo…",
  },
  createDocument: {
    en: "Create document",
    es: "Crear documento",
    fr: "Créer le document",
    de: "Dokument erstellen",
    pt: "Criar documento",
    nl: "Document aanmaken",
    it: "Crea documento",
  },
  creating: {
    en: "Creating…",
    es: "Creando…",
    fr: "Création…",
    de: "Wird erstellt…",
    pt: "Criando…",
    nl: "Bezig met aanmaken…",
    it: "Creazione…",
  },
  startOver: {
    en: "Start over",
    es: "Empezar de nuevo",
    fr: "Recommencer",
    de: "Von vorn beginnen",
    pt: "Começar de novo",
    nl: "Opnieuw beginnen",
    it: "Ricomincia",
  },
  addLineItem: {
    en: "+ Add line item",
    es: "+ Añadir partida",
    fr: "+ Ajouter un poste",
    de: "+ Position hinzufügen",
    pt: "+ Adicionar item",
    nl: "+ Regelitem toevoegen",
    it: "+ Aggiungi voce",
  },
  removeLineItem: {
    en: "Remove line item",
    es: "Eliminar partida",
    fr: "Supprimer le poste",
    de: "Position entfernen",
    pt: "Remover item",
    nl: "Regelitem verwijderen",
    it: "Rimuovi voce",
  },
  reviewDisclaimer: {
    en: "Review the line items and totals before sending — you're responsible for the final quote.",
    es: "Revisa las partidas y los totales antes de enviarlo — eres responsable del presupuesto final.",
    fr: "Vérifiez les postes et les totaux avant l'envoi — vous êtes responsable du devis final.",
    de: "Prüfe die Positionen und Summen vor dem Versand — du bist für das endgültige Angebot verantwortlich.",
    pt: "Revise os itens e os totais antes de enviar — você é responsável pelo orçamento final.",
    nl: "Controleer de regelitems en totalen voor het verzenden — je bent verantwoordelijk voor de definitieve offerte.",
    it: "Controlla le voci e i totali prima dell'invio — sei responsabile del preventivo finale.",
  },
} as const satisfies Record<string, Localized>;

export type QuoteLabelKey = keyof typeof QUOTE_LABELS;

/** Looks up a translated label, falling back to English for an unsupported/
 *  missing language code — same defensive precedent as
 *  ai-draft-types.ts's documentTypeLabel/documentTypePlaceholder. */
export function ql(key: QuoteLabelKey, languageCode?: string): string {
  const entry = QUOTE_LABELS[key];
  const lang = languageCode && isSupportedDraftLang(languageCode) ? languageCode : "en";
  return (entry as Localized)[lang] ?? entry.en;
}

// The "Describe the job" textarea's example placeholder — one entry, not a
// per-type table like ai-draft-types.ts's DOCUMENT_TYPES (Magic Quote has no
// document-type dimension). `currencyPrefix` is threaded through exactly
// like the existing English-only template in magic-quote-form.tsx, just
// re-derived per language instead of hardcoded to English phrasing.
const MAGIC_QUOTE_PLACEHOLDER: Localized = {
  en: "e.g. iPhone 13 screen replacement for Alice, {c}80 for the part, 1 hour labor at {c}70/hr",
  es: "ej. cambio de pantalla de iPhone 13 para Alice, {c}80 la pieza, 1 hora de mano de obra a {c}70/h",
  fr: "ex. remplacement d'écran iPhone 13 pour Alice, {c}80 pour la pièce, 1 heure de main-d'œuvre à {c}70/h",
  de: "z. B. iPhone 13 Displaytausch für Alice, {c}80 für das Teil, 1 Stunde Arbeitszeit zu {c}70/Std.",
  pt: "ex. troca de tela do iPhone 13 para Alice, {c}80 pela peça, 1 hora de mão de obra a {c}70/h",
  nl: "bijv. iPhone 13 schermvervanging voor Alice, {c}80 voor het onderdeel, 1 uur arbeid à {c}70/uur",
  it: "es. sostituzione schermo iPhone 13 per Alice, {c}80 per il pezzo, 1 ora di manodopera a {c}70/h",
};

export function magicQuotePlaceholder(currencyPrefix: string, languageCode?: string): string {
  const lang = languageCode && isSupportedDraftLang(languageCode) ? languageCode : "en";
  const template = MAGIC_QUOTE_PLACEHOLDER[lang] ?? MAGIC_QUOTE_PLACEHOLDER.en;
  return template.replaceAll("{c}", currencyPrefix);
}
