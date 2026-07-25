import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseCandidates,
  parseParties,
  placeCandidates,
  fallbackSuggestion,
  suggestFields,
  formatItemsByPage,
  type Candidate,
} from "./suggest-fields";

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
      { page: 1, x: 0.2, y: 0.8, type: "signature", role: 0, purpose: null },
      { page: 2, x: 0.5, y: 0.1, type: "date", role: null, purpose: null },
    ]);
  });

  it("parses purpose on a text field, and ignores it on non-text / unknown values", () => {
    const raw = JSON.stringify([
      { page: 1, x: 0.1, y: 0.1, type: "text", role: 0, purpose: "name" },
      { page: 1, x: 0.1, y: 0.2, type: "text", role: 0, purpose: "Title" },
      { page: 1, x: 0.1, y: 0.3, type: "text", role: 0, purpose: "gibberish" },
      { page: 1, x: 0.1, y: 0.4, type: "signature", role: 0, purpose: "name" },
    ]);
    expect(parseCandidates(raw, 1).map((c) => c.purpose)).toEqual(["name", "title", null, null]);
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
    expect(result[0]).toEqual({ page: 5, x: 0, y: 1, type: "text", role: null, purpose: null });
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

  it("parses fields out of the {parties, fields} object shape", () => {
    const raw = JSON.stringify({
      parties: [{ role: 0, label: "Employer" }],
      fields: [{ page: 1, x: 0.2, y: 0.8, type: "signature", role: 0 }],
    });
    const result = parseCandidates(raw, 1);
    expect(result).toEqual([{ page: 1, x: 0.2, y: 0.8, type: "signature", role: 0, purpose: null }]);
  });

  it("returns [] for an object with no fields array", () => {
    expect(parseCandidates(JSON.stringify({ parties: [{ role: 0, label: "X" }] }), 1)).toEqual([]);
  });
});

describe("parseParties", () => {
  it("parses the parties list from the object shape, sorted and deduped by role", () => {
    const raw = JSON.stringify({
      parties: [
        { role: 1, label: "Employee" },
        { role: 0, label: "Employer" },
        { role: 1, label: "Employee (dupe)" },
      ],
      fields: [],
    });
    expect(parseParties(raw)).toEqual([
      { role: 0, label: "Employer", name: null, title: null, company: null },
      { role: 1, label: "Employee", name: null, title: null, company: null },
    ]);
  });

  it("strips a markdown fence", () => {
    const raw = "```json\n" + JSON.stringify({ parties: [{ role: 0, label: "Tenant" }], fields: [] }) + "\n```";
    expect(parseParties(raw)).toEqual([
      { role: 0, label: "Tenant", name: null, title: null, company: null },
    ]);
  });

  it("drops entries with a bad role or empty label", () => {
    const raw = JSON.stringify({
      parties: [
        { role: -1, label: "Bad" },
        { role: 1.5, label: "Bad" },
        { role: 0, label: "" },
        { role: 2, label: "Good" },
      ],
    });
    expect(parseParties(raw)).toEqual([
      { role: 2, label: "Good", name: null, title: null, company: null },
    ]);
  });

  it("returns [] for a bare array (no parties key) or unparseable text", () => {
    expect(parseParties(JSON.stringify([{ page: 1, x: 0.1, y: 0.1, type: "text" }]))).toEqual([]);
    expect(parseParties("not json")).toEqual([]);
    expect(parseParties(JSON.stringify({ fields: [] }))).toEqual([]);
  });
});

describe("placeCandidates", () => {
  it("places each field's left edge at its candidate x, vertically centered on its candidate y, using the type's default size", () => {
    const candidates: Candidate[] = [{ page: 1, x: 0.5, y: 0.5, type: "checkbox", role: null, purpose: null }];
    const result = placeCandidates(candidates);
    expect(result).toHaveLength(1);
    // checkbox default size is 0.03/0.03 — left edge at x=0.5, vertically
    // centered on y=0.5. x must NOT be shifted left by half the width: the
    // PROMPT tells the model x is already where the blank starts (e.g. a
    // label's own x + w), so treating it as a box center would walk the
    // field back onto the label it was placed after — see placeCandidates.
    expect(result[0].x).toBeCloseTo(0.5);
    expect(result[0].y).toBeCloseTo(0.5 - 0.015);
    expect(result[0].width).toBeCloseTo(0.03);
    expect(result[0].height).toBeCloseTo(0.03);
  });

  it("does not shift a field back onto the label it was placed after (the reported bug: c.x is already the label's end, not a box center to straddle)", () => {
    // Simulates what the model is instructed to return for a "Signature:"
    // label ending around x=0.37 (e.g. a label at x=0.25 with w=0.10, plus
    // the prompt's small gap). The signature field is 0.22 wide — the
    // widest field type — so the old center-on-x behavior would have
    // pulled its left edge back to roughly 0.26, landing on top of the
    // label text itself.
    const labelEndX = 0.37;
    const candidates: Candidate[] = [{ page: 1, x: labelEndX, y: 0.5, type: "signature", role: 0, purpose: null }];
    const result = placeCandidates(candidates);
    expect(result[0].x).toBeGreaterThanOrEqual(labelEndX);
  });

  it("keeps candidates on different pages independent even at the same coordinates", () => {
    const candidates: Candidate[] = [
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 0, purpose: null },
      { page: 2, x: 0.5, y: 0.5, type: "signature", role: 0, purpose: null },
    ];
    const result = placeCandidates(candidates);
    expect(result[0].x).toBeCloseTo(result[1].x);
    expect(result[0].y).toBeCloseTo(result[1].y);
    expect(result[0].page).toBe(1);
    expect(result[1].page).toBe(2);
  });

  it("nudges a second candidate away from the first when they'd overlap on the same page", () => {
    const candidates: Candidate[] = [
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 0, purpose: null },
      { page: 1, x: 0.5, y: 0.5, type: "signature", role: 1, purpose: null },
    ];
    const result = placeCandidates(candidates);
    expect(result[1]).not.toEqual(result[0]);
  });

  it("preserves role and clamps against page edges", () => {
    const candidates: Candidate[] = [{ page: 1, x: 0, y: 0, type: "signature", role: 3, purpose: null }];
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
    expect(result.parties).toEqual([]); // bare-array response names no parties
  });

  it("returns detected parties alongside suggestions for the object-shape response", async () => {
    mockExtractPdfTextPositions.mockResolvedValue([{ page: 1, str: "Signature:", x: 0.1, y: 0.8 }]);
    mockCreate.mockResolvedValue(
      anthropicTextResponse(
        JSON.stringify({
          parties: [
            { role: 0, label: "Employer" },
            { role: 1, label: "Employee" },
          ],
          fields: [{ page: 1, x: 0.2, y: 0.8, type: "signature", role: 1 }],
        })
      )
    );
    const result = await suggestFields(Buffer.from(""), 1, "anthropic");
    expect(result.unreadable).toBe(false);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].role).toBe(1);
    expect(result.parties).toEqual([
      { role: 0, label: "Employer", name: null, title: null, company: null },
      { role: 1, label: "Employee", name: null, title: null, company: null },
    ]);
  });
});

describe("parseParties — party details lifted from the document", () => {
  it("keeps name, title and company when the document states them", () => {
    const raw = JSON.stringify({
      parties: [
        {
          role: 0,
          label: "Consultant",
          name: "Amara Okafor",
          title: "Managing Director",
          company: "Meridian Consulting Ltd",
        },
      ],
    });
    expect(parseParties(raw)).toEqual([
      {
        role: 0,
        label: "Consultant",
        name: "Amara Okafor",
        title: "Managing Director",
        company: "Meridian Consulting Ltd",
      },
    ]);
  });

  it("handles a company with no named signatory", () => {
    // Very common: the entity is named in the preamble but whoever signs for it
    // isn't. The company still gives the sender useful context.
    const raw = JSON.stringify({
      parties: [{ role: 0, label: "Client", name: null, title: null, company: "Acme Tech Solutions B.V." }],
    });
    expect(parseParties(raw)).toEqual([
      { role: 0, label: "Client", name: null, title: null, company: "Acme Tech Solutions B.V." },
    ]);
  });

  it("treats a response with no detail keys at all as all-null", () => {
    // Backward compatibility: the model often omits these, and any response
    // produced before the prompt change has no such keys. Absence must be
    // ordinary, not an error.
    const raw = JSON.stringify({ parties: [{ role: 0, label: "Party A" }] });
    expect(parseParties(raw)).toEqual([
      { role: 0, label: "Party A", name: null, title: null, company: null },
    ]);
  });

  it("nulls out details that aren't usable strings", () => {
    const raw = JSON.stringify({
      parties: [{ role: 0, label: "Signatory", name: 42, title: "   ", company: null }],
    });
    expect(parseParties(raw)).toEqual([
      { role: 0, label: "Signatory", name: null, title: null, company: null },
    ]);
  });

  it("trims whitespace and caps detail length", () => {
    const raw = JSON.stringify({
      parties: [{ role: 0, label: "Party A", name: "  Amara Okafor  ", company: "C".repeat(200) }],
    });
    const [party] = parseParties(raw);
    expect(party.name).toBe("Amara Okafor");
    expect(party.company).toHaveLength(80);
  });

  it("still drops a party with a bad role even when details look good", () => {
    // The existing role/label guards must not be weakened by the new fields —
    // a party with no usable role can't be bound to a recipient at all.
    const raw = JSON.stringify({
      parties: [{ role: -1, label: "Consultant", name: "Amara Okafor" }],
    });
    expect(parseParties(raw)).toEqual([]);
  });
});

describe("formatItemsByPage", () => {
  it("includes each item's width as a third number so the model can locate a label's end, not just its start", () => {
    const text = formatItemsByPage([{ page: 1, str: "Signature:", x: 0.1, y: 0.8, width: 0.12 }]);
    expect(text).toContain('(0.10, 0.80, 0.12) "Signature:"');
  });

  it("falls back to 0 width rather than printing \"undefined\" for items that predate width tracking", () => {
    const text = formatItemsByPage([{ page: 1, str: "Signature:", x: 0.1, y: 0.8 }]);
    expect(text).toContain('(0.10, 0.80, 0.00) "Signature:"');
    expect(text).not.toContain("undefined");
  });

  it("groups items under a \"Page N:\" header per page, sorted ascending", () => {
    const text = formatItemsByPage([
      { page: 2, str: "Second", x: 0, y: 0, width: 0 },
      { page: 1, str: "First", x: 0, y: 0, width: 0 },
    ]);
    const lines = text.split("\n");
    expect(lines[0]).toBe("Page 1:");
    expect(lines).toContain("Page 2:");
    expect(lines.indexOf("Page 1:")).toBeLessThan(lines.indexOf("Page 2:"));
  });
});
