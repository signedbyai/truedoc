import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { normalizeAIProvider, generateAIText } from "./ai-provider";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("./anthropic", () => ({ getAnthropic: () => ({ messages: { create: mockCreate } }) }));

// DeepSeek is reached via a *real* @anthropic-ai/sdk client (just pointed at
// a different base URL/key), so this mocks the SDK's default export itself
// rather than the app's own ./anthropic wrapper — a separate mock target
// from mockCreate above, since ai-provider.ts constructs this client
// directly instead of going through getAnthropic().
const { mockDeepSeekCreate, MockAnthropicCtor } = vi.hoisted(() => {
  const mockDeepSeekCreate = vi.fn();
  // A regular function, not an arrow function — arrow functions have no
  // [[Construct]] internal method, so `mockImplementation` fails with
  // "is not a constructor" the moment ai-provider.ts calls `new Anthropic()`.
  const MockAnthropicCtor = vi.fn().mockImplementation(function MockAnthropic() {
    return { messages: { create: mockDeepSeekCreate } };
  });
  return { mockDeepSeekCreate, MockAnthropicCtor };
});
vi.mock("@anthropic-ai/sdk", () => ({ default: MockAnthropicCtor }));

describe("normalizeAIProvider", () => {
  it("passes through a valid 'mistral' value for a test org", () => {
    expect(normalizeAIProvider("mistral", true)).toBe("mistral");
  });

  it("passes through a valid 'anthropic' value for a test org", () => {
    expect(normalizeAIProvider("anthropic", true)).toBe("anthropic");
  });

  it("passes through a valid 'deepseek' value for a test org", () => {
    expect(normalizeAIProvider("deepseek", true)).toBe("deepseek");
  });

  it("falls back to mistral for null/undefined/unexpected values even for a test org", () => {
    expect(normalizeAIProvider(null, true)).toBe("mistral");
    expect(normalizeAIProvider(undefined, true)).toBe("mistral");
    expect(normalizeAIProvider("something-else", true)).toBe("mistral");
    expect(normalizeAIProvider("", true)).toBe("mistral");
  });

  // The guardrail: an org not on the ai_test_org allowlist AND without the
  // Business-plan feature stays on Mistral no matter what ai_provider is set
  // to — see supabase/migrations/0028 and plan.ts's aiAnthropicProvider.
  it("forces mistral for a non-test, non-Business org even when ai_provider requests anthropic or deepseek", () => {
    expect(normalizeAIProvider("anthropic", false)).toBe("mistral");
    expect(normalizeAIProvider("deepseek", false)).toBe("mistral");
    expect(normalizeAIProvider("mistral", false)).toBe("mistral");
  });

  // Phase 2 (2026-07-24): a real customer org reaches Anthropic through the
  // Business-plan feature flag, passed in as the third param — independent
  // of ai_test_org.
  it("honors anthropic for a non-test org when the Business-plan flag is enabled", () => {
    expect(normalizeAIProvider("anthropic", false, true)).toBe("anthropic");
  });

  it("still forces mistral for a non-test, non-Business org when the plan flag is explicitly false", () => {
    expect(normalizeAIProvider("anthropic", false, false)).toBe("mistral");
  });

  // DeepSeek has no plan gate — it's only ever reachable via ai_test_org,
  // regardless of the Business-plan flag, and stays internal-only.
  it("never honors deepseek via the Business-plan flag, only via ai_test_org", () => {
    expect(normalizeAIProvider("deepseek", false, true)).toBe("mistral");
    expect(normalizeAIProvider("deepseek", true, false)).toBe("deepseek");
  });
});

describe("generateAIText", () => {
  const originalFetch = global.fetch;
  const originalMistralKey = process.env.MISTRAL_API_KEY;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    mockCreate.mockReset();
    mockDeepSeekCreate.mockReset();
    MockAnthropicCtor.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MISTRAL_API_KEY = originalMistralKey;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
  });

  it("calls the Anthropic SDK with the fast-tier model and returns joined text blocks", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "hello" }, { type: "text", text: "world" }] });
    const result = await generateAIText({ provider: "anthropic", tier: "fast", prompt: "hi", maxTokens: 100 });
    expect(result).toBe("hello\nworld");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001", max_tokens: 100 })
    );
  });

  it("calls the Anthropic SDK with the quality-tier model", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "draft" }] });
    await generateAIText({ provider: "anthropic", tier: "quality", prompt: "hi", maxTokens: 100 });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-5" }));
  });

  it("filters out non-text content blocks from an Anthropic response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: "kept" },
        { type: "tool_use", text: "ignored" },
      ],
    });
    const result = await generateAIText({ provider: "anthropic", tier: "fast", prompt: "hi", maxTokens: 100 });
    expect(result).toBe("kept");
  });

  it("calls Mistral's chat completions endpoint with the fast-tier model and returns the message content", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "mistral says hi" } }] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await generateAIText({ provider: "mistral", tier: "fast", prompt: "hi", maxTokens: 100 });
    expect(result).toBe("mistral says hi");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mistral.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("mistral-small-latest");
  });

  it("uses the quality-tier Mistral model", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "draft" } }] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await generateAIText({ provider: "mistral", tier: "quality", prompt: "hi", maxTokens: 100 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("mistral-large-latest");
  });

  it("throws a clear error when MISTRAL_API_KEY isn't configured", async () => {
    delete process.env.MISTRAL_API_KEY;
    await expect(generateAIText({ provider: "mistral", tier: "fast", prompt: "hi", maxTokens: 100 })).rejects.toThrow(
      "MISTRAL_API_KEY"
    );
  });

  it("throws when Mistral responds with a non-OK status", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    }) as unknown as typeof fetch;

    await expect(generateAIText({ provider: "mistral", tier: "fast", prompt: "hi", maxTokens: 100 })).rejects.toThrow(
      /Mistral API error \(401\)/
    );
  });

  it("throws when Mistral's response doesn't have the expected shape", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: "shape" }),
    }) as unknown as typeof fetch;

    await expect(generateAIText({ provider: "mistral", tier: "fast", prompt: "hi", maxTokens: 100 })).rejects.toThrow(
      "Unexpected response shape"
    );
  });

  it("calls the DeepSeek client (via the Anthropic SDK, pointed at DeepSeek's base URL) with the fast-tier model", async () => {
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    mockDeepSeekCreate.mockResolvedValue({ content: [{ type: "text", text: "deepseek says hi" }] });

    const result = await generateAIText({ provider: "deepseek", tier: "fast", prompt: "hi", maxTokens: 100 });

    expect(result).toBe("deepseek says hi");
    expect(MockAnthropicCtor).toHaveBeenCalledWith({
      apiKey: "test-deepseek-key",
      baseURL: "https://api.deepseek.com/anthropic",
    });
    expect(mockDeepSeekCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "deepseek-v4-flash", max_tokens: 100 })
    );
  });

  it("uses the quality-tier DeepSeek model", async () => {
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    mockDeepSeekCreate.mockResolvedValue({ content: [{ type: "text", text: "draft" }] });

    await generateAIText({ provider: "deepseek", tier: "quality", prompt: "hi", maxTokens: 100 });

    expect(mockDeepSeekCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "deepseek-v4-pro" }));
  });

  it("filters out non-text content blocks from a DeepSeek response, same as Anthropic", async () => {
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    mockDeepSeekCreate.mockResolvedValue({
      content: [
        { type: "text", text: "kept" },
        { type: "tool_use", text: "ignored" },
      ],
    });

    const result = await generateAIText({ provider: "deepseek", tier: "fast", prompt: "hi", maxTokens: 100 });
    expect(result).toBe("kept");
  });

  it("throws a clear error when DEEPSEEK_API_KEY isn't configured", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(
      generateAIText({ provider: "deepseek", tier: "fast", prompt: "hi", maxTokens: 100 })
    ).rejects.toThrow("DEEPSEEK_API_KEY");
    expect(mockDeepSeekCreate).not.toHaveBeenCalled();
  });
});
