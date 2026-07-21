import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TYPES,
  DRAFT_LANGUAGES,
  detectDraftLang,
  documentTypeLabel,
  documentTypePlaceholder,
  draftLanguageLabel,
  isSupportedDraftLang,
} from "./ai-draft-types";

describe("DRAFT_LANGUAGES", () => {
  it("is a Latin-script, WinAnsi-safe subset — excludes languages text-to-pdf.ts's Helvetica standard font can't render", () => {
    // Not just "fewer languages than the summary feature" — specifically
    // Polish (diacritics outside WinAnsi/CP1252) and every non-Latin-script
    // language, since drafts get rendered into a real PDF, unlike the
    // summary feature's plain browser text.
    const codes = DRAFT_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("es");
    expect(codes).toContain("fr");
    expect(codes).toContain("de");
    expect(codes).toContain("pt");
    expect(codes).toContain("nl");
    expect(codes).toContain("it");
    expect(codes).not.toContain("pl");
    expect(codes).not.toContain("zh");
    expect(codes).not.toContain("ar");
    expect(codes).not.toContain("hi");
    expect(codes).not.toContain("ja");
  });
});

describe("isSupportedDraftLang / draftLanguageLabel", () => {
  it("agrees on the supported set", () => {
    expect(isSupportedDraftLang("fr")).toBe(true);
    expect(draftLanguageLabel("fr")).toBe("French");
    expect(isSupportedDraftLang("xx")).toBe(false);
    expect(draftLanguageLabel("xx")).toBe("English");
  });

  it("rejects a language the summary feature supports but drafting doesn't", () => {
    expect(isSupportedDraftLang("zh")).toBe(false);
    expect(draftLanguageLabel("zh")).toBe("English");
  });
});

describe("detectDraftLang", () => {
  it("maps a region-qualified locale to its primary language subtag", () => {
    expect(detectDraftLang("pt-BR")).toBe("pt");
    expect(detectDraftLang("en-US")).toBe("en");
  });

  it("falls back to English for a locale outside the draft-safe subset, even if the summary feature supports it", () => {
    expect(detectDraftLang("zh-CN")).toBe("en");
    expect(detectDraftLang("pl-PL")).toBe("en");
    expect(detectDraftLang("ar")).toBe("en");
  });

  it("falls back to English for empty/missing input", () => {
    expect(detectDraftLang(undefined)).toBe("en");
    expect(detectDraftLang(null)).toBe("en");
    expect(detectDraftLang("")).toBe("en");
  });
});

describe("DOCUMENT_TYPES ordering", () => {
  it("keeps the general/catch-all template last, after every more-specific type", () => {
    expect(DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1].id).toBe("general");
  });

  it("gives every template a translation for all 7 draft languages (no silent English fallback)", () => {
    const codes = DRAFT_LANGUAGES.map((l) => l.code);
    for (const type of DOCUMENT_TYPES) {
      for (const code of codes) {
        expect(type.labels[code], `${type.id}.labels.${code}`).toBeTruthy();
        expect(type.placeholders[code], `${type.id}.placeholders.${code}`).toBeTruthy();
      }
    }
  });
});

describe("documentTypeLabel", () => {
  it("still resolves known document types (regression check alongside the new language exports)", () => {
    expect(documentTypeLabel("nda")).toBe("Non-Disclosure Agreement (NDA)");
    expect(documentTypeLabel("not-a-type")).toBe("Document");
  });

  it("defaults to the English label when no language is given, or an unsupported one is", () => {
    expect(documentTypeLabel("waiver")).toBe("Waiver / Release of Liability");
    expect(documentTypeLabel("waiver", "zh")).toBe("Waiver / Release of Liability");
  });

  it("translates the label for a supported non-English language", () => {
    expect(documentTypeLabel("bike_rental", "fr")).toBe("Contrat de Location de Vélo");
    expect(documentTypeLabel("waiver", "es")).toBe("Exención de Responsabilidad");
  });

  it("uses the Dutch trade term (not a literal translation) for boiler and bike, only when the language is Dutch", () => {
    expect(documentTypeLabel("boiler_maintenance", "en")).toBe("Boiler Maintenance Agreement");
    expect(documentTypeLabel("boiler_maintenance", "nl")).toBe("CV-onderhoudscontract");

    expect(documentTypeLabel("bike_rental", "en")).toBe("Bicycle Rental Agreement");
    expect(documentTypeLabel("bike_rental", "nl")).toBe("Fietsverhuurovereenkomst");
  });
});

describe("documentTypePlaceholder", () => {
  it("defaults to the English example text when no language is given", () => {
    expect(documentTypePlaceholder("freelance")).toContain("$2,000");
  });

  it("switches the example's currency along with the translated text for a euro-zone language", () => {
    const fr = documentTypePlaceholder("freelance", "fr");
    expect(fr).toContain("€");
    expect(fr).not.toContain("$");
  });

  it("returns an empty string for an unknown document type", () => {
    expect(documentTypePlaceholder("not-a-type")).toBe("");
  });
});
