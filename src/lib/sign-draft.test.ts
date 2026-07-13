import { describe, expect, it } from "vitest";
import { draftStorageKey, serializeDraft, parseDraft, mergeRestoredValues, hasAnyValue } from "./sign-draft";

describe("draftStorageKey", () => {
  it("namespaces the key by token", () => {
    expect(draftStorageKey("abc123")).toBe("signedby:sign-draft:abc123");
  });
});

describe("serializeDraft / parseDraft round trip", () => {
  it("parses back exactly what was serialized, when fresh", () => {
    const now = Date.now();
    const raw = serializeDraft({ f1: "Jane Doe", f2: "" }, now);
    expect(parseDraft(raw, now)).toEqual({ f1: "Jane Doe", f2: "" });
  });

  it("still parses a draft saved a few hours ago", () => {
    const now = Date.now();
    const raw = serializeDraft({ f1: "Jane" }, now - 60 * 60 * 1000);
    expect(parseDraft(raw, now)).toEqual({ f1: "Jane" });
  });
});

describe("parseDraft", () => {
  it("returns null for null/empty raw input", () => {
    expect(parseDraft(null, Date.now())).toBeNull();
    expect(parseDraft("", Date.now())).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(parseDraft("{not valid json", Date.now())).toBeNull();
  });

  it("returns null when the parsed shape has no values object", () => {
    expect(parseDraft(JSON.stringify({ savedAt: Date.now() }), Date.now())).toBeNull();
    expect(parseDraft(JSON.stringify({ values: "not an object", savedAt: Date.now() }), Date.now())).toBeNull();
    expect(parseDraft(JSON.stringify({ values: null, savedAt: Date.now() }), Date.now())).toBeNull();
  });

  it("returns null when savedAt is missing or not a number", () => {
    expect(parseDraft(JSON.stringify({ values: { f1: "x" } }), Date.now())).toBeNull();
    expect(parseDraft(JSON.stringify({ values: { f1: "x" }, savedAt: "yesterday" }), Date.now())).toBeNull();
  });

  it("returns null for a draft older than a week", () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const raw = serializeDraft({ f1: "Jane" }, eightDaysAgo);
    expect(parseDraft(raw, now)).toBeNull();
  });

  it("still accepts a draft just under a week old", () => {
    const now = Date.now();
    const almostAWeekAgo = now - (7 * 24 * 60 * 60 * 1000 - 1000);
    const raw = serializeDraft({ f1: "Jane" }, almostAWeekAgo);
    expect(parseDraft(raw, now)).toEqual({ f1: "Jane" });
  });
});

describe("mergeRestoredValues", () => {
  const fieldIds = ["f1", "f2", "f3"];

  it("fills in currently-empty fields from the restored draft", () => {
    const result = mergeRestoredValues({ f1: "", f2: "", f3: "" }, { f1: "Jane", f2: "Doe" }, fieldIds);
    expect(result).toEqual({ f1: "Jane", f2: "Doe", f3: "" });
  });

  it("never overwrites a field that already has a value", () => {
    const result = mergeRestoredValues({ f1: "Already typed", f2: "" }, { f1: "Restored value" }, fieldIds);
    expect(result.f1).toBe("Already typed");
  });

  it("ignores restored entries for fields that no longer exist on the document", () => {
    const result = mergeRestoredValues({ f1: "" }, { f1: "Jane", "removed-field": "stale" }, ["f1"]);
    expect(result).toEqual({ f1: "Jane" });
    expect(result["removed-field"]).toBeUndefined();
  });

  it("returns current unchanged when restored is null", () => {
    const current = { f1: "", f2: "x" };
    expect(mergeRestoredValues(current, null, fieldIds)).toEqual(current);
  });

  it("skips a restored value that's itself blank", () => {
    const result = mergeRestoredValues({ f1: "" }, { f1: "   " }, fieldIds);
    expect(result.f1).toBe("");
  });
});

describe("hasAnyValue", () => {
  it("is false for an empty or all-blank values map", () => {
    expect(hasAnyValue({})).toBe(false);
    expect(hasAnyValue({ f1: "", f2: "   " })).toBe(false);
  });

  it("is true when at least one field has a real value", () => {
    expect(hasAnyValue({ f1: "", f2: "Jane" })).toBe(true);
  });
});
