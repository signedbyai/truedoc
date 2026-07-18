import { describe, expect, it } from "vitest";
import { remapFieldSignerIds } from "./field-persist";

type F = { signerId: string | null; type: string };

describe("remapFieldSignerIds", () => {
  it("remaps a field's signer to the recipient's new id (the core bug)", () => {
    const fields: F[] = [{ signerId: "old-1", type: "signature" }];
    const oldToNew = new Map([["old-1", "new-1"]]);
    const valid = new Set(["new-1"]);
    expect(remapFieldSignerIds(fields, oldToNew, valid)).toEqual([{ signerId: "new-1", type: "signature" }]);
  });

  it("keeps distinct parties assigned to their own new ids", () => {
    const fields: F[] = [
      { signerId: "old-a", type: "signature" },
      { signerId: "old-b", type: "date" },
    ];
    const oldToNew = new Map([
      ["old-a", "new-a"],
      ["old-b", "new-b"],
    ]);
    const valid = new Set(["new-a", "new-b"]);
    expect(remapFieldSignerIds(fields, oldToNew, valid)).toEqual([
      { signerId: "new-a", type: "signature" },
      { signerId: "new-b", type: "date" },
    ]);
  });

  it("nulls a signer that no longer maps to any recipient (removed recipient)", () => {
    const fields: F[] = [{ signerId: "gone", type: "text" }];
    expect(remapFieldSignerIds(fields, new Map(), new Set(["new-1"]))).toEqual([{ signerId: null, type: "text" }]);
  });

  it("leaves an already-unassigned field null", () => {
    const fields: F[] = [{ signerId: null, type: "checkbox" }];
    expect(remapFieldSignerIds(fields, new Map(), new Set(["new-1"]))).toEqual([{ signerId: null, type: "checkbox" }]);
  });

  it("keeps an id that's already current (no remap entry, still valid)", () => {
    const fields: F[] = [{ signerId: "real-1", type: "initials" }];
    expect(remapFieldSignerIds(fields, new Map(), new Set(["real-1"]))).toEqual([
      { signerId: "real-1", type: "initials" },
    ]);
  });
});
