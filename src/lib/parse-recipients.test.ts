import { describe, expect, it } from "vitest";
import { parseRecipients } from "./parse-recipients";

describe("parseRecipients", () => {
  it("parses a bare email per line", () => {
    expect(parseRecipients("jane@acme.com\njohn@acme.com")).toEqual([
      { name: null, email: "jane@acme.com" },
      { name: null, email: "john@acme.com" },
    ]);
  });

  it("parses 'Name <email>' format", () => {
    expect(parseRecipients("Jane Doe <jane@acme.com>")).toEqual([{ name: "Jane Doe", email: "jane@acme.com" }]);
  });

  it("skips blank lines and trims whitespace", () => {
    expect(parseRecipients("  jane@acme.com  \n\n\n  john@acme.com")).toEqual([
      { name: null, email: "jane@acme.com" },
      { name: null, email: "john@acme.com" },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients("   \n  \n")).toEqual([]);
  });

  it("handles a mix of formats", () => {
    expect(parseRecipients("jane@acme.com\nJohn Doe <john@acme.com>")).toEqual([
      { name: null, email: "jane@acme.com" },
      { name: "John Doe", email: "john@acme.com" },
    ]);
  });
});
