import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2 } from "@/lib/r2";
import { extractPdfText } from "@/lib/pdf-text";
import { generateAIText, normalizeAIProvider, type AIProvider } from "@/lib/ai-provider";
import { isSupportedSummaryLang, summaryLanguageLabel } from "@/lib/summary-languages";

type SummaryResult = { summary: string } | { error: string };
type AdminClient = ReturnType<typeof createAdminClient>;
type DocRow = { id: string; title: string; file_path: string };

const SUMMARY_PROMPT = (title: string, text: string) => `You are helping someone understand a document before they \
sign it electronically. Below is the extracted text of a document titled "${title}". Write a short, plain-language \
summary (3-5 sentences) covering: what kind of document this is, who the parties are (if named), and what the \
signer is agreeing to.

Be neutral and purely descriptive. Do not give legal advice, do not flag risks, do not recommend changes, and do \
not speculate beyond what the text actually says. If the extracted text looks garbled, truncated, or otherwise \
unreadable, say so plainly instead of guessing at content.

Document text:
${text}`;

const TRANSLATE_PROMPT = (languageName: string, englishSummary: string) => `Translate the following plain-language \
document summary into ${languageName}. Preserve the meaning exactly — do not add information, omit anything, give \
legal advice, or flag risks that aren't already present. Return only the translated summary text, nothing else \
(no preamble, no quotes around it).

Summary:
${englishSummary}`;

async function generateEnglishSummary(admin: AdminClient, doc: DocRow, provider: AIProvider): Promise<SummaryResult> {
  let bytes: Buffer;
  try {
    const { body } = await getFromR2(doc.file_path);
    bytes = body;
  } catch (err) {
    console.error("R2 fetch failed for summary", err);
    return { error: "Could not load the document." };
  }

  let text = "";
  try {
    text = await extractPdfText(bytes);
  } catch (err) {
    console.error("PDF text extraction failed", err);
    return { error: "Could not read this document." };
  }

  if (!text) {
    return {
      error: "This document doesn't contain extractable text (it may be a scanned image), so a summary isn't available.",
    };
  }

  try {
    const summary = (
      await generateAIText({ provider, tier: "fast", prompt: SUMMARY_PROMPT(doc.title, text), maxTokens: 400 })
    ).trim();

    if (!summary) return { error: "Couldn't generate a summary — try again." };

    await admin
      .from("documents")
      .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
      .eq("id", doc.id);

    return { summary };
  } catch (err) {
    console.error("AI summary generation failed", err);
    return { error: "Couldn't generate a summary right now — try again later." };
  }
}

async function translateSummary(
  admin: AdminClient,
  documentId: string,
  englishSummary: string,
  existingTranslations: Record<string, string>,
  lang: string,
  provider: AIProvider
): Promise<SummaryResult> {
  if (existingTranslations[lang]) return { summary: existingTranslations[lang] };

  try {
    const translated = (
      await generateAIText({
        provider,
        tier: "fast",
        prompt: TRANSLATE_PROMPT(summaryLanguageLabel(lang), englishSummary),
        maxTokens: 400,
      })
    ).trim();

    if (!translated) return { error: "Couldn't translate the summary — try again." };

    await admin
      .from("documents")
      .update({ ai_summary_translations: { ...existingTranslations, [lang]: translated } })
      .eq("id", documentId);

    return { summary: translated };
  } catch (err) {
    console.error("AI summary translation failed", err);
    return { error: "Couldn't translate the summary right now — try again later." };
  }
}

// Generates (or returns the cached) plain-language summary for a document,
// optionally translated into one of the supported languages
// (summary-languages.ts). The source PDF never changes after upload, so the
// English summary is cached on the documents row indefinitely
// (ai_summary) — this keeps Anthropic API cost to one call per document for
// English, regardless of how many times signers open the "what am I
// signing?" panel. Translations are a second, much cheaper call (translating
// the short cached summary, not re-reading the whole document) and are
// cached per language in ai_summary_translations, so each language is only
// ever translated once per document too.
export async function getOrCreateDocumentSummary(documentId: string, lang: string = "en"): Promise<SummaryResult> {
  const admin = createAdminClient();
  const targetLang = isSupportedSummaryLang(lang) ? lang : "en";

  const { data: doc } = await admin
    .from("documents")
    .select("id, org_id, title, file_path, ai_summary, ai_summary_translations")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found." };

  // Called from the signer-facing summary route, which only has the
  // signing token — no org/session context of its own like the sender-side
  // suggest-fields/draft routes have — so the org's AI provider preference
  // has to be resolved here, from the document's own org_id, rather than
  // being passed in by the caller.
  const { data: org } = await admin
    .from("organizations")
    .select("ai_provider, ai_test_org")
    .eq("id", doc.org_id)
    .single();
  const provider = normalizeAIProvider(org?.ai_provider, org?.ai_test_org ?? false);

  let englishSummary = doc.ai_summary as string | null;
  if (!englishSummary) {
    const generated = await generateEnglishSummary(admin, doc, provider);
    if ("error" in generated) return generated;
    englishSummary = generated.summary;
  }

  if (targetLang === "en") return { summary: englishSummary };

  const existingTranslations = (doc.ai_summary_translations as Record<string, string> | null) || {};
  return translateSummary(admin, documentId, englishSummary, existingTranslations, targetLang, provider);
}
