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

// PROVIDER POSTURE (updated 2026-07-24, Phase 2 of ANTHROPIC_PROVIDER_OPTION_
// SCOPE.md / ADMIN_ROLE_SCOPE.md): Mistral is the default AI provider for the
// live customer service. Anthropic is now ALSO customer-selectable, but only
// for orgs on the Business plan (src/lib/plan.ts's `aiAnthropicProvider`
// feature) — same "an organization can instead choose Anthropic... in its
// workspace settings" disclosure that /privacy + /dpa carried from
// 2026-07-13 through 2026-07-16 (removed then, restored now with a
// Business-plan qualifier added to match the actual gate). See
// src/components/ai-provider-settings.tsx + api/org/ai-provider/route.ts for
// the picker, gated on `planHasFeature(org.plan, "aiAnthropicProvider")`.
//
// DeepSeek (and Gemini, if ever built) stay INTERNAL-testing-only —
// never customer-selectable regardless of plan, and not disclosed anywhere.
// If either is ever promoted to the live service, it needs its own
// /privacy + /dpa disclosure and its own plan.ts feature flag first.
//
// Guardrail (organizations.ai_test_org, migration 0028): kept as a SEPARATE,
// additional way to unlock Anthropic/DeepSeek — for SignedBy's own internal
// test/synthetic orgs, independent of plan. A real customer org reaches
// Anthropic through the Business-plan feature flag, not this flag; this flag
// exists so internal testing doesn't require a paid plan. DeepSeek is only
// ever reachable via this flag, never via a plan.

/** Defensive normalization for a raw DB value. Honors "anthropic" when
 *  either the org is on the ai_test_org allowlist (internal testing,
 *  independent of plan) OR `isAnthropicPlanEnabled` is true (a real
 *  Business-plan org that's turned it on in Settings — see PROVIDER POSTURE
 *  above). "deepseek" is only ever honored via `isTestOrg` — it has no plan
 *  gate and stays internal-only regardless of what plan the org is on.
 *  Anything else (bad data, an unapplied migration, a downgraded org whose
 *  ai_provider column still says "anthropic") collapses to Mistral, the
 *  always-safe default. */
export function normalizeAIProvider(
  value: string | null | undefined,
  isTestOrg: boolean,
  isAnthropicPlanEnabled = false
): AIProvider {
  if (value === "anthropic" && (isTestOrg || isAnthropicPlanEnabled)) return "anthropic";
  if (value === "deepseek" && isTestOrg) return "deepseek";
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
