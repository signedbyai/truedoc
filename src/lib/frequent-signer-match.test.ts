import { describe, expect, it } from "vitest";
import { matchFrequentSignerByName, type MatchableSigner } from "./frequent-signer-match";

const SIGNERS: MatchableSigner[] = [
  { id: "1", name: "Rana Patel", email: "rana@evergreenlogistics.co" },
  { id: "2", name: "Jordan Torres", email: "jordan@northfieldbuild.com" },
  { id: "3", name: "John Smith", email: "john.smith@example.com" },
  { id: "4", name: "John Doe", email: "john.doe@example.com" },
];

describe("matchFrequentSignerByName", () => {
  it("matches an exact name", () => {
    expect(matchFrequentSignerByName("Rana Patel", SIGNERS)?.id).toBe("1");
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(matchFrequentSignerByName("  rana PATEL  ", SIGNERS)?.id).toBe("1");
  });

  it("returns null for no match", () => {
    expect(matchFrequentSignerByName("Someone Else", SIGNERS)).toBeNull();
  });

  it("returns null for an empty or whitespace-only name", () => {
    expect(matchFrequentSignerByName("", SIGNERS)).toBeNull();
    expect(matchFrequentSignerByName("   ", SIGNERS)).toBeNull();
  });

  it("returns null rather than guessing when a first name alone would be ambiguous", () => {
    // "John" alone shouldn't match either John Smith or John Doe -- this
    // only ever compares against full saved names, never substrings.
    expect(matchFrequentSignerByName("John", SIGNERS)).toBeNull();
  });

  it("returns null when two saved contacts share the exact same name", () => {
    const dupes: MatchableSigner[] = [
      { id: "1", name: "Alex Kim", email: "alex@work.com" },
      { id: "2", name: "Alex Kim", email: "alex@personal.com" },
    ];
    expect(matchFrequentSignerByName("Alex Kim", dupes)).toBeNull();
  });
});
