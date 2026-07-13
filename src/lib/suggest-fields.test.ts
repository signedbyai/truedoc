import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseCandidates, placeCandidates, fallbackSuggestion, suggestFields, type Candidate } from "./suggest-fields";

// suggestFields() orchestrates extractPdfTextPositions + an Anthropic call;
// mocked here so the "unreadable" branching (the actual bug-prone part —
// getting the flag right in each of the four outcomes) can be tested
// without touching pdfjs or the real API.
const { mockExtractPdfTextPositions } = vi.hoisted(() => ({ mockExtractPdfTextPositions: vi.fn() }));
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("./pdf-text", () => ({ extractPdfTextPositions: mockExtractPdfTextPositions }));
vi.mock("./anthropic", () => ({ getAnthropic: () => ({ messages: { create: mockCreate } }) }));

describe("parseCandidates", () => {
  it("parses a well-formed JSON array", () => {
    const raw = JSON.stringify([
      { page: 1, x: 0.2, y: 0.8, type: "signature", role: 0 },
      { page: 2, x: 0.5, y: 0.1, type: "date", role: null },
    ]);
    const result = parseCandidates(raw, 3);
    expect(result).toEqual([
      { page: 1, x: 0.2, y: 0.8, type: "signature", role: 0 },
      { page: 2, x: 0.5, y: 0.1, type: "date", role: null },
    ]);
  });

  it("strips a markdown fence Claude adds despite instructions not to", () => {
    const raw = "```json\n" + JSON.stringify([{ page: 1, x: 0.1, y: 0.1, type: "initials", role: null }]) + "\n```";
    const result = parseCandidates(raw, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("initials");
  });

  it("returns an empty array for unparseable text", () => {
    expect(parseCandidates("not json at all", 1)).toEqual([]);
    expect(parseCandidates("", 1)).toEqual([]);
  });

  it("returns an empty array when the JSON isn't an array", () => {
    expect(parseCandidates(JSON.stringify({ page: 1, x: 0.1, y: 0.1, type: "text" }), 1)).toEqual([]);
  });

  it("drops entries with an invalid field type", () => {
    const raw = JSON.stringify([
      { page: 1, x: 0.1, y: 0.1, type: "not-a-real-type", role: null },
      { page: 1, x: 0.2, y: 0.2, type: "text", role: null },
    ]);
    const result = parseCandidates(raw, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
  });

  it("drops entries missing numeric page/x/y", () => {
    const raw = JSON.stringify([
      { page: "one", x: 0.1, y: 0.1, type: "text" },
      { page: 1, x: 0.2, type: "text" },
      { page: 1, x: 0.2, y: 0.2, type: "text" },
    ]);
    const result = parseCandidates(raw, 1);
    expect(result).toHaveLength(1);
  });

  it("clamps x/y into 0-1 and page into 1..pageCount", () => {
    const raw = JSON.stringify([{ page: 99, x: -0.5, y: 1.5, type: "text", role: null }]);
    const result = parseCandidates(raw, 5);
    expect(result[0]).toEqual({ page: 5, x: 0, y: 1, type: "text", role: null });
  });

  it("only accepts non-negative integer roles, otherwise null", () => {
    const raw = JSON.stringify([
      { page: 1, x: 0.1, y: 0.1, type: "text", role: 2 },
      { page: 1, x: 0.1, y: 0.1, type: "text", role: -1 },
      { page: 1, x: 0.1, y: 0.1, type: "text", role: 1.5 },
      { page: 1, x: 0.1, y: 0.1, type: "text", role: "0" },
    ]);
    const result = parseCandidates(raw, 1);
    expect(result.map((c) => c.role)).toEqual([2, null, null, null]);
  });

  it("caps the result at 20 entries", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ page: 1, x: 0.1, y: i / 30, type: "text", role: null }));
    const result = parseCandidates(JSON.stringify(many), 1);
    expect(result).toHaveLength(20);
  });
});

describe("placeCandidates", () => {
  it("centers each field on its candidate click point using the type's default size", () => {
    const candidates: Candidate[] = [{ page: 1, x: 0.5, y: 0.5, type: "checkbox", role: null }];
    const result = placeCandidates(candidates);
    expect(result).toHaveLength(1);
    // checkbox default size is 0.03/0.03 — centered on (0.5, 0.5).
    expect(result[0].x).toBeCloseTo(0.5 - 0.015);
    expect(result[0].y).toBeCloseTo(0.5 - 0.015);
    expect(result[0].width).toBeCloseTo(0.03);
    expect(result[0].height).toBeCloseTo(0.03);
  });

  it("keeps candidates on different pages independent even at the same coordinates", () => {
    const candidates: Candidate[] = [
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 0 },
      { page: 2, x: 0.5, y: 0.5, type: "signature", role: 0 },
    ];
    const result = placeCandidates(candidates);
    expect(result[0].x).toBeCloseTo(result[1].x);
    expect(result[0].y).toBeCloseTo(result[1].y);
    expect(result[0].page).toBe(1);
    expect(result[1].page).toBe(2);
  });

  it("nudges a second candidate away from the first when they'd overlap on the same page", () => {
    const candidates: Candidate[] = [
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 0 },
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 1 },
    ];
    const result = placeCandidates(candidates);
    expect(result[1]).not.toEqual(result[0]);
  });

  it("preserves role and clamps against page edges", () => {
    const candidates: Candidate[] = [{ page: 1, x: 0, y: 0, type: "signature", role: 3 }];
    const result = placeCandidates(candidates);
    expect(result[0].role).toBe(3);
    expect(result[0].x).toBeGreaterThanOrEqual(0);
    expect(result[0].y).toBeGreaterThanOrEqual(0);
  });
});

describe("fallbackSuggestion", () => {
  it("places a single initials field in the top-right corner of page 1", () => {
    const result = fallbackSuggestion();
    expect(result.page).toBe(1);
    expect(result.type).toBe("initials");
    expect(result.role).toBeNull();
    // "Top right": x is near the right edge, y is near the top.
    expect(result.x).toBeGreaterThan(0.5);
    expect(result.x + result.width).toBeLessThanOrEqual(1);
    expect(result.y).toBeLessThan(0.2);
  });
});

function anthropicTextResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("suggestFields", () => {
  beforeEach(() => {
    mockExtractPdfTextPositions.mockReset();
    mockCreate.mockReset();
  });

  it("marks the fallback unreadable when there's no extractable text at all (scanned/image PDF)", async () => {
    mockExtractPdfTextPositions.mockResolvedValue([]);
    const result = await suggestFields(Buffer.from(""), 1, "anthropic");
    expect(result.unreadable).toBe(true);
    expect(result.suggestions).toEqual([fallbackSuggestion()]);
    expect(mockCreate).not.toHaveBeenCalled(); // no point calling Claude with nothing to show it
  });

  it("marks the fallback unreadable when the Anthropic call itself fails", async () => {
    mockExtractPdfTextPositions.mockResolvedValue([{ page: 1, str: "Signature:", x: 0.1, y: 0.8 }]);
    mockCreate.mockRejectedValue(new Error("network error"));
    const result = await suggestFields(Buffer.from(""), 1, "anthropic");
    expect(result.unreadable).toBe(true);
    expect(result.suggestions).toEqual([fallbackSuggestion()]);
  });

  it("does NOT mark the fallback unreadable when real text was read but Claude found no candidates", async () => {
    mockExtractPdfTextPositions.mockResolvedValue([{ page: 1, str: "Just some prose, no fields here.", x: 0.1, y: 0.5 }]);
    mockCreate.mockResolvedValue(anthropicTextResponse("[]"));
    const result = await suggestFields(Buffer.from(""), 1, "anthropic");
    expect(result.unreadable).toBe(false);
    expect(result.suggestions).toEqual([fallbackSuggestion()]);
  });

  it("returns real placed suggestions, not unreadable, when Claude finds candidates", async () => {
    mockExtractPdfTextPositions.mockResolvedValue([{ page: 1, str: "Signature:", x: 0.1, y: 0.8 }]);
    mockCreate.mockResolvedValue(
      anthropicTextResponse(JSON.stringify([{ page: 1, x: 0.2, y: 0.8, type: "signature", role: null }]))
    );
    const result = await suggestFields(Buffer.from(""), 1, "anthropic");
    expect(result.unreadable).toBe(false);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].type).toBe("signature");
  });
});
