import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromR2 } from "@/lib/r2";
import { extractPdfText } from "@/lib/pdf-text";
import { getAnthropic } from "@/lib/anthropic";

type SummaryResult = { summary: string } | { error: string };

const SUMMARY_PROMPT = (title: string, text: string) => `You are helping someone understand a document before they \
sign it electronically. Below is the extracted text of a document titled "${title}". Write a short, plain-language \
summary (3-5 sentences) covering: what kind of document this is, who the parties are (if named), and what the \
signer is agreeing to.

Be neutral and purely descriptive. Do not give legal advice, do not flag risks, do not recommend changes, and do \
not speculate beyond what the text actually says. If the extracted text looks garbled, truncated, or otherwise \
unreadable, say so plainly instead of guessing at content.

Document text:
${text}`;

// Generates (or returns the cached) plain-language summary for a document.
// The source PDF never changes after upload, so once generated the summary
// is cached on the documents row indefinitely — this keeps Anthropic API
// cost to one call per document, regardless of how many times signers open
// the "what am I signing?" panel.
export async function getOrCreateDocumentSummary(documentId: string): Promise<SummaryResult> {
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("id, title, file_path, ai_summary")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found." };
  if (doc.ai_summary) return { summary: doc.ai_summary };

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
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: SUMMARY_PROMPT(doc.title, text) }],
    });

    const summary = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!summary) return { error: "Couldn't generate a summary — try again." };

    await admin
      .from("documents")
      .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
      .eq("id", documentId);

    return { summary };
  } catch (err) {
    console.error("Anthropic summary generation failed", err);
    return { error: "Couldn't generate a summary right now — try again later." };
  }
}
