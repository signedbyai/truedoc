import { describe, expect, it, vi, beforeEach } from "vitest";
import { extractQuoteLineItems, parseQuoteResponse } from "./quote-document";

// extractQuoteLineItems() orchestrates an Anthropic call; mocked here so the
// validation/parsing/CANNOT_QUOTE branching can be tested without hitting
// the real API. Mirrors draft-document.test.ts's mocking pattern for the
// same ./anthropic module.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("./anthropic", () => ({ getAnthropic: () => ({ messages: { create: mockCreate } }) }));

function anthropicTextResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("parseQuoteResponse", () => {
  it("parses a well-formed response", () => {
    const result = parseQuoteResponse(
      JSON.stringify({
        title: "Screen Repair",
        items: [{ description: "Screen", quantity: 1, unitPrice: 150 }],
      })
    );
    expect(result).toEqual({ title: "Screen Repair", items: [{ description: "Screen", quantity: 1, unitPrice: 150 }] });
  });

  it("strips a markdown fence around the JSON", () => {
    const result = parseQuoteResponse('```json\n{"title": "T", "items": [{"description": "X", "quantity": 1, "unitPrice": 1}]}\n```');
    expect(result.title).toBe("T");
    expect(result.items).toHaveLength(1);
  });

  it("drops an item missing a description rather than failing the whole response", () => {
    const result = parseQuoteResponse(
      JSON.stringify({
        title: "T",
        items: [
          { description: "", quantity: 1, unitPrice: 10 },
          { description: "Valid", quantity: 1, unitPrice: 10 },
        ],
      })
    );
    expect(result.items).toEqual([{ description: "Valid", quantity: 1, unitPrice: 10 }]);
  });

  it("drops an item with a non-positive quantity or negative price", () => {
    const result = parseQuoteResponse(
      JSON.stringify({
        title: "T",
        items: [
          { description: "Zero qty", quantity: 0, unitPrice: 10 },
          { description: "Negative price", quantity: 1, unitPrice: -5 },
          { description: "Valid", quantity: 2, unitPrice: 10 },
        ],
      })
    );
    expect(result.items).toEqual([{ description: "Valid", quantity: 2, unitPrice: 10 }]);
  });

  it("returns an empty title/items for unparseable JSON", () => {
    expect(parseQuoteResponse("not json at all")).toEqual({ title: "", items: [] });
  });

  it("returns empty items when the items key isn't an array", () => {
    expect(parseQuoteResponse(JSON.stringify({ title: "T", items: "nope" }))).toEqual({ title: "T", items: [] });
  });
});

describe("extractQuoteLineItems", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("rejects an empty description before calling Anthropic", async () => {
    const result = await extractQuoteLineItems("   ");
    expect(result).toEqual({ error: "Describe the job before generating a quote." });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects a description over the character cap before calling Anthropic", async () => {
    const result = await extractQuoteLineItems("a".repeat(2001));
    expect("error" in result).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns the parsed title and line items on success", async () => {
    mockCreate.mockResolvedValue(
      anthropicTextResponse(
        JSON.stringify({
          title: "iPhone 13 Screen Repair",
          items: [
            { description: "Replacement screen", quantity: 1, unitPrice: 80 },
            { description: "Labor", quantity: 1, unitPrice: 70 },
          ],
        })
      )
    );
    const result = await extractQuoteLineItems("iPhone 13 screen replacement, $80 part, $70 labor", "anthropic");
    expect(result).toEqual({
      title: "iPhone 13 Screen Repair",
      items: [
        { description: "Replacement screen", quantity: 1, unitPrice: 80 },
        { description: "Labor", quantity: 1, unitPrice: 70 },
      ],
    });
  });

  it("falls back to a generic title when none is returned", async () => {
    mockCreate.mockResolvedValue(
      anthropicTextResponse(JSON.stringify({ items: [{ description: "Job", quantity: 1, unitPrice: 50 }] }))
    );
    const result = await extractQuoteLineItems("a simple job", "anthropic");
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.title).toBe("Quote");
  });

  it("detects a CANNOT_QUOTE response and surfaces it as an error, not a quote", async () => {
    mockCreate.mockResolvedValue(
      anthropicTextResponse("CANNOT_QUOTE: This requires a licensed structural engineer's own pricing judgment.")
    );
    const result = await extractQuoteLineItems("assess whether my house's foundation is structurally sound", "anthropic");
    expect(result).toEqual({ error: "This requires a licensed structural engineer's own pricing judgment." });
  });

  it("returns an error when there are no usable line items after parsing", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse(JSON.stringify({ title: "T", items: [] })));
    const result = await extractQuoteLineItems("something vague", "anthropic");
    expect("error" in result).toBe(true);
  });

  it("returns an error when the Anthropic call itself fails", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));
    const result = await extractQuoteLineItems("a job description", "anthropic");
    expect(result).toEqual({ error: "Couldn't generate a quote right now — try again in a moment." });
  });

  it("returns an error when Anthropic responds with empty content", async () => {
    mockCreate.mockResolvedValue(anthropicTextResponse(""));
    const result = await extractQuoteLineItems("a job description", "anthropic");
    expect("error" in result).toBe(true);
  });
});
