import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic";

// Single entry point for every AI-assisted text-generation call in the app
// (field suggestions, document drafting, summaries/translation) — swaps
// between Anthropic and Mistral based on the calling org's ai_provider
// setting (organizations.ai_provider, migration 0015), instead of each
// call site hard-coding Anthropic directly. Both providers here are called
// with a single user-turn prompt and no system prompt (none of this app's
// current AI features need multi-turn history), and both return plain
// text — callers don't need to know which provider actually answered.

export type AIProvider = "anthropic" | "mistral";

/** Defensive normalization for a raw DB value — the migration's CHECK
 *  constraint should already guarantee this, but a null/unexpected value
 *  (e.g. the migration not yet applied, per this project's manual
 *  Supabase-SQL-editor workflow) should fall back to the long-standing
 *  default rather than throw. */
export function normalizeAIProvider(value: string | null | undefined): AIProvider {
  return value === "mistral" ? "mistral" : "anthropic";
}

// "fast" — cheap/quick tasks: field suggestions, summaries, translation.
// "quality" — the one feature that needs the strongest available model:
// document drafting (already the sole caller of Sonnet vs. Haiku pre-
// Mistral, see plan.ts's aiDraft comment on why that one is pricier).
export type AITier = "fast" | "quality";

const ANTHROPIC_MODELS: Record<AITier, string> = {
  fast: "claude-haiku-4-5-20251001",
  quality: "claude-sonnet-5",
};

// La Plateforme's rolling aliases — always the current version of that
// tier, same "latest" convention Mistral documents for these model names.
const MISTRAL_MODELS: Record<AITier, string> = {
  fast: "mistral-small-latest",
  quality: "mistral-large-latest",
};

async function generateWithAnthropic(tier: AITier, prompt: string, maxTokens: number): Promise<string> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODELS[tier],
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function generateWithMistral(tier: AITier, prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured.");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODELS[tier],
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mistral API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Unexpected response shape from Mistral.");
  return text;
}

export async function generateAIText(opts: {
  provider: AIProvider;
  tier: AITier;
  prompt: string;
  maxTokens: number;
}): Promise<string> {
  const { provider, tier, prompt, maxTokens } = opts;
  return provider === "mistral"
    ? generateWithMistral(tier, prompt, maxTokens)
    : generateWithAnthropic(tier, prompt, maxTokens);
}
