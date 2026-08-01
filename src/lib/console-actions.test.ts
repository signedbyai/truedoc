import { describe, expect, it } from "vitest";
import { parseExpiresAt, auditProvenance } from "./console-actions";

describe("parseExpiresAt", () => {
  it("treats an omitted or empty value as no expiration", () => {
    expect(parseExpiresAt(undefined)).toEqual({ ok: true, iso: null });
    expect(parseExpiresAt(null)).toEqual({ ok: true, iso: null });
    expect(parseExpiresAt("")).toEqual({ ok: true, iso: null });
  });

  it("normalizes a valid date-only string to a full ISO datetime", () => {
    const result = parseExpiresAt("2026-09-30");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.iso).toBe(new Date("2026-09-30").toISOString());
  });

  it("normalizes a valid ISO datetime string as-is", () => {
    const result = parseExpiresAt("2026-09-30T00:00:00Z");
    expect(result).toEqual({ ok: true, iso: "2026-09-30T00:00:00.000Z" });
  });

  it("rejects a string that doesn't parse as a date, with a friendly error", () => {
    const result = parseExpiresAt("next friday-ish");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/couldn't understand/i);
  });
});

// AI_AGENT_MCP_SIGNING_SCOPE.md — audit-trail provenance is the whole
// answer to "can you tell an agent sent this," so this mapping being right
// matters more than most pure helpers in this file.
describe("auditProvenance", () => {
  it("tags a console-originated send with via_console, no agent flag", () => {
    expect(auditProvenance("console")).toEqual({ via_console: true });
  });

  it("tags an MCP-originated send with via_mcp AND agent_triggered", () => {
    expect(auditProvenance("mcp")).toEqual({ via_mcp: true, agent_triggered: true });
  });
});
