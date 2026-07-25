import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic";

// Single entry point for every AI-assisted text-generation call in the app
// (field suggestions, document drafting, summaries/translation) — swaps
// between Anthropic, Mistral, and DeepSeek based on the calling org's
// ai_provider setting (organizations.ai_provider, migration 0015/0016),
// instead of each call site hard-coding a provider directly. All three are
// called with a single user-turn prompt and no system prompt (none of this
// app's current AI features need multi-turn history), and all return plain
// text — callers don't need to know which provider actually answered.

export type AIProvider = "anthropic" | "mistral" | "deepseek";

// PROVIDER POSTURE (updated 2026-07-20): Mistral is the ONLY AI provider used
// in the live customer service and the only one disclosed in /privacy + /dpa.
// Anthropic exists here for SignedBy's INTERNAL performance testing only —
// there's no user-facing picker (removed 2026-07-16), and it is NOT disclosed
// as a customer-facing sub-processor. (A same-day privacy-assessment revision
// on 2026-07-20 briefly re-added Anthropic to /privacy + /dpa as something a
// customer could choose instead of Mistral; reverted the same day — Anthropic
// stays undisclosed/internal-only, see [[legal-pages-subprocessors]].)
// Switching an org's `ai_provider` remains an admin-only SQL change.
//
// DeepSeek (and Gemini, if ever built) stay INTERNAL-testing-only and are
// not disclosed anywhere.
//
// Guardrail (organizations.ai_test_org, migration 0028): normalizeAIProvider
// below only honors a non-Mistral ai_provider value when this flag is true
// for that org — otherwise it silently falls back to Mistral no matter what
// ai_provider is set to. This is independent of any provider's disclosure
// status: it's what stops a fat-fingered SQL change from quietly sending a
// real customer's document text to Anthropic, an undisclosed processor. If
// Anthropic (or any provider) is ever promoted to the live customer service,
// it needs /privacy + /dpa disclosure FIRST.
//
// PLANNED (not built): Google Gemini as a further testing provider. Data-
// residency note (see privacy_assessment/): route via Vertex AI in an EU region
// (e.g. europe-west1/4), NOT the consumer Gemini API (US default). To wire it up
// for internal testing: add "gemini" to this union + normalizeAIProvider, the DB
// CHECK constraint (new migration), and a generateWithGemini() path.

/** Defensive normalization for a raw DB value, gated by the org's
 *  ai_test_org allowlist flag (organizations.ai_test_org, migration 0028) —
 *  see the PROVIDER POSTURE note above. `isTestOrg` false collapses any
 *  value straight to Mistral, so a plain unallowlisted org can never end up
 *  on a non-Mistral provider even if ai_provider is somehow set otherwise
 *  (bad data, a migration not yet applied, etc.). Default provider is
 *  always Mistral. */
export function normalizeAIProvider(value: string | null | undefined, isTestOrg: boolean): AIProvider {
  if (!isTestOrg) return "mistral";
  if (value === "anthropic" || value === "deepseek") return value;
  return "mistral";
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

// DeepSeek's Anthropic-compatible endpoint (api-docs.deepseek.com/guides/
// anthropic_api) maps Claude-style model names to its own models itself,
// but we pass its real model names directly rather than relying on that
// mapping: deepseek-v4-flash is the fast/economical tier, deepseek-v4-pro
// the more capable one.
const DEEPSEEK_MODELS: Record<AITier, string> = {
  fast: "deepseek-v4-flash",
  quality: "deepseek-v4-pro",
};

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/anthropic";

// DeepSeek is reached with the same @anthropic-ai/sdk client used for real
// Anthropic calls — just pointed at DeepSeek's base URL with a DeepSeek key
// instead, since DeepSeek's Anthropic-compatible endpoint accepts the same
// request/response shape (x-api-key auth, messages.create, etc.). Built
// fresh per call rather than cached as a singleton (unlike getAnthropic()),
// matching generateWithMistral()'s pattern of reading its env var fresh
// each call — a stale-key read is a bigger risk here than the cost of
// constructing a lightweight SDK client per request.
function getDeepSeekClient(): Anthropic {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");
  return new Anthropic({ apiKey, baseURL: DEEPSEEK_BASE_URL });
}

function extractAnthropicText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function generateWithAnthropic(tier: AITier, prompt: string, maxTokens: number): Promise<string> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODELS[tier],
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return extractAnthropicText(message);
}

async function generateWithDeepSeek(tier: AITier, prompt: string, maxTokens: number): Promise<string> {
  const deepseek = getDeepSeekClient();
  const message = await deepseek.messages.create({
    model: DEEPSEEK_MODELS[tier],
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return extractAnthropicText(message);
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
  if (provider === "mistral") return generateWithMistral(tier, prompt, maxTokens);
  if (provider === "deepseek") return generateWithDeepSeek(tier, prompt, maxTokens);
  return generateWithAnthropic(tier, prompt, maxTokens);
}
