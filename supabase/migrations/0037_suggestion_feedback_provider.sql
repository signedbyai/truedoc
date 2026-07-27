-- Lets the field-suggestion correction data (0036,
-- FIELD_SUGGESTION_LEARNING_SCOPE.md) be broken down by which AI provider/
-- model actually generated the suggestion being logged -- e.g. is Mistral's
-- suggestion quality improving over time, or does one provider get
-- corrected less than another. Infrastructure metadata, not personal or
-- document data -- doesn't touch the anonymization guarantee (still no
-- document/org/signer id column anywhere on this table).
--
-- `model` is whichever alias ai-provider.ts's modelForProvider() resolves to
-- for (provider, "fast") at suggestion time (e.g. "mistral-small-latest"),
-- NOT necessarily the concrete version a rolling alias actually served that
-- specific request -- generateWithMistral() (ai-provider.ts) doesn't parse
-- Mistral's response for a server-echoed resolved model id. A trend over
-- created_at can still surface "this got better/worse around this date,"
-- just not cleanly attributed to a specific underlying Mistral model version
-- bump the way it could be for Anthropic/DeepSeek, which already pin exact
-- model strings.
--
-- Both nullable: rows logged before this migration have neither, and that's
-- fine to leave as-is rather than backfill guesswork.
alter table public.suggestion_feedback add column if not exists provider text
  check (provider is null or provider in ('anthropic', 'mistral', 'deepseek'));
alter table public.suggestion_feedback add column if not exists model text;

create index if not exists suggestion_feedback_provider_idx on public.suggestion_feedback (provider);
