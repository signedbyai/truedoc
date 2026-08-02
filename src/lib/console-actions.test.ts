import { describe, expect, it } from "vitest";
import { parseExpiresAt, auditProvenance, checkSingleSignerRoleCount } from "./console-actions";

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

// Guards the 2026-08-02 bug where sendDocumentAction/bulk-send inserted
// document_fields with signer_id left null and template_role never
// resolved, making every field invisible to the signer regardless of how
// many parties the template was built for. These cases pin down exactly
// which field_map shapes are allowed through a single-signer send.
describe("checkSingleSignerRoleCount", () => {
  it("allows a template with no role tags at all (never party-distinguished)", () => {
    expect(checkSingleSignerRoleCount([{ role: null }, { role: null }])).toEqual({ ok: true });
  });

  it("allows a template where every field is tagged the same single role", () => {
    expect(checkSingleSignerRoleCount([{ role: 0 }, { role: 0 }, { role: 0 }])).toEqual({ ok: true });
  });

  it("allows a mix of one real role and untagged fields", () => {
    expect(checkSingleSignerRoleCount([{ role: 0 }, { role: null }])).toEqual({ ok: true });
  });

  it("blocks a template with 2 distinct roles", () => {
    expect(checkSingleSignerRoleCount([{ role: 0 }, { role: 1 }])).toEqual({ ok: false, roleCount: 2 });
  });

  it("blocks a template with 3+ distinct roles, reporting the real count", () => {
    expect(checkSingleSignerRoleCount([{ role: 0 }, { role: 1 }, { role: 2 }, { role: 0 }])).toEqual({ ok: false, roleCount: 3 });
  });

  it("treats an empty field_map as fine (caller handles the 'no fields' case separately)", () => {
    expect(checkSingleSignerRoleCount([])).toEqual({ ok: true });
  });
});
