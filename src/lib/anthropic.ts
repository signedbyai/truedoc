import Anthropic from "@anthropic-ai/sdk";

// Server-only. Reads ANTHROPIC_API_KEY from the environment automatically —
// never expose this client or the key to the browser bundle.
let client: Anthropic | null = null;

export function getAnthropic() {
  if (client) return client;
  client = new Anthropic();
  return client;
}
