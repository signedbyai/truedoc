import { describe, expect, it, vi, beforeEach } from "vitest";
import { draftDocument } from "./draft-document";

// draftDocument() orchestrates an Anthropic call; mocked here so the
// validation/parsing/CANNOT_DRAFT branching (the actual bug-prone part) can
// be tested without hitting the real API. Mirrors suggest-fields.test.ts's
// mocking pattern for the same ./anthropic module.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("./anthropic", () => ({ getAnthropic: () => ({ messages: { create: mockCreate } }) }));

function anthropicTextResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("draftDocument", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("rejects an unknown document type before calling Anthropic", async () => {
    const result = await draftDocument("not-a-real-type", "some description");
    expect(result).toEqual({ error: "Choose a document type." });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty description before calling Anthropic", async () => {
    const result = await draftDocument("freelance", "   ");
    expect("error" in result).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects a description over the character cap before calling Anthropic", async () => {
    const result = await draftDocument("freelance", "a".repeat(2001));
    expect("error" in result).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("parses the first line as title and the rest as body", async () => {
    mockCreate.mockResolvedValue(
      anthropicTextResponse("Freelance Design Agreement\n\nThis agreement is between [Client] and [Designer]...")
    );
    const result = await draftDocument("freelance", "logo design project, $2000, net-30", "anthropic");
    expect(result).toEqual({
      title: "Freelance Design Agreement",
      body: "This agreement is between [Client] and [Designer]...",
    });
  });

  it("strips a leading markdown heading marker from the title line", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse("# NDA Agreement\n\nBody text here."));
    const result = await draftDocument("nda", "mutual NDA before a partnership discussion", "anthropic");
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.title).toBe("NDA Agreement");
  });

  it("detects a CANNOT_DRAFT response and surfaces it as an error, not a draft", async () => {
    mockCreate.mockResolvedValue(
      anthropicTextResponse("CANNOT_DRAFT: This requires a licensed attorney to prepare a real estate deed.")
    );
    const result = await draftDocument("general", "transfer ownership of my house to my brother", "anthropic");
    expect(result).toEqual({ error: "This requires a licensed attorney to prepare a real estate deed." });
  });

  it("falls back to a generic error if CANNOT_DRAFT has no reason text", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse("CANNOT_DRAFT:"));
    const result = await draftDocument("general", "something out of scope", "anthropic");
    expect(result).toEqual({ error: "This isn't something we can draft automatically." });
  });

  it("returns an error when the Anthropic call itself fails", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));
    const result = await draftDocument("waiver", "one-day photography workshop release form", "anthropic");
    expect(result).toEqual({ error: "Couldn't generate a draft right now — try again in a moment." });
  });

  it("returns an error when Anthropic responds with empty content", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse(""));
    const result = await draftDocument("waiver", "one-day photography workshop release form", "anthropic");
    expect("error" in result).toBe(true);
  });

  it("returns an error when the body is empty after the title line", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse("Just A Title"));
    const result = await draftDocument("general", "a one-time equipment rental agreement", "anthropic");
    expect("error" in result).toBe(true);
  });

  it("falls back to the document type label when the title line has nothing left after stripping heading markers", async () => {
    // A first line that's only "#" characters strips down to "" once the
    // leading-heading-marker regex runs, even though the overall response
    // isn't blank (the body below still has real content).
    mockCreate.mockResolvedValue(anthropicTextResponse("#\nActual body content here."));
    const result = await draftDocument("nda", "mutual NDA before a partnership discussion", "anthropic");
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.title).toBe("Non-Disclosure Agreement (NDA)");
  });
});
