import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { normalizeAIProvider, generateAIText } from "./ai-provider";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("./anthropic", () => ({ getAnthropic: () => ({ messages: { create: mockCreate } }) }));

describe("normalizeAIProvider", () => {
  it("passes through a valid 'mistral' value", () => {
    expect(normalizeAIProvider("mistral")).toBe("mistral");
  });

  it("passes through a valid 'anthropic' value", () => {
    expect(normalizeAIProvider("anthropic")).toBe("anthropic");
  });

  it("falls back to anthropic for null/undefined/unexpected values", () => {
    expect(normalizeAIProvider(null)).toBe("anthropic");
    expect(normalizeAIProvider(undefined)).toBe("anthropic");
    expect(normalizeAIProvider("something-else")).toBe("anthropic");
    expect(normalizeAIProvider("")).toBe("anthropic");
  });
});

describe("generateAIText", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.MISTRAL_API_KEY;

  beforeEach(() => {
    mockCreate.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MISTRAL_API_KEY = originalKey;
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
});
