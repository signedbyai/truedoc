import { describe, expect, it } from "vitest";
import { parseNdjsonLine, splitNdjsonLines } from "./ndjson";

describe("splitNdjsonLines", () => {
  it("returns complete lines and holds back a trailing partial line", () => {
    const result = splitNdjsonLines('{"a":1}\n{"b":2}\n{"c":3');
    expect(result.lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(result.rest).toBe('{"c":3');
  });

  it("returns everything as rest when there's no newline yet", () => {
    const result = splitNdjsonLines('{"a":1');
    expect(result.lines).toEqual([]);
    expect(result.rest).toBe('{"a":1');
  });

  it("drops empty/whitespace-only lines", () => {
    const result = splitNdjsonLines('{"a":1}\n\n   \n{"b":2}\n');
    expect(result.lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(result.rest).toBe("");
  });
});

describe("parseNdjsonLine", () => {
  it("parses a valid JSON object line", () => {
    expect(parseNdjsonLine('{"type":"status","content":"Thinking…"}')).toEqual({
      type: "status",
      content: "Thinking…",
    });
  });

  it("returns null for malformed JSON instead of throwing", () => {
    expect(parseNdjsonLine("not json")).toBe(null);
    expect(parseNdjsonLine("")).toBe(null);
  });

  it("returns null for valid JSON that isn't an object", () => {
    expect(parseNdjsonLine("42")).toBe(null);
    expect(parseNdjsonLine('"just a string"')).toBe(null);
    expect(parseNdjsonLine("null")).toBe(null);
  });
});
