import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { installMapUpsertPolyfill } from "./pdfjs-map-polyfill";

// This environment's Node/V8 already has the real getOrInsert(Computed)
// methods, so these tests delete them first to simulate the actual
// production failure (iOS Safari 18.7.8, which predates the Feb-2026
// browser rollout) and confirm the polyfill both fills the gap and defers
// to a native implementation when one already exists.

function deleteNative(ctor: { prototype: object }) {
  const proto = ctor.prototype as Record<string, unknown>;
  delete proto.getOrInsert;
  delete proto.getOrInsertComputed;
}

describe("installMapUpsertPolyfill", () => {
  let originalMapGetOrInsert: unknown;
  let originalMapGetOrInsertComputed: unknown;
  let originalWeakMapGetOrInsert: unknown;
  let originalWeakMapGetOrInsertComputed: unknown;

  beforeEach(() => {
    originalMapGetOrInsert = Map.prototype.getOrInsert;
    originalMapGetOrInsertComputed = Map.prototype.getOrInsertComputed;
    originalWeakMapGetOrInsert = WeakMap.prototype.getOrInsert;
    originalWeakMapGetOrInsertComputed = WeakMap.prototype.getOrInsertComputed;
    deleteNative(Map);
    deleteNative(WeakMap);
  });

  afterEach(() => {
    // Restore whatever this environment natively had, so other test files
    // aren't affected by this one's teardown order.
    Map.prototype.getOrInsert = originalMapGetOrInsert as typeof Map.prototype.getOrInsert;
    Map.prototype.getOrInsertComputed = originalMapGetOrInsertComputed as typeof Map.prototype.getOrInsertComputed;
    WeakMap.prototype.getOrInsert = originalWeakMapGetOrInsert as typeof WeakMap.prototype.getOrInsert;
    WeakMap.prototype.getOrInsertComputed =
      originalWeakMapGetOrInsertComputed as typeof WeakMap.prototype.getOrInsertComputed;
  });

  it("adds getOrInsert to Map when missing, returning the existing value if present", () => {
    installMapUpsertPolyfill();
    const m = new Map<string, number>([["a", 1]]);
    expect(m.getOrInsert("a", 99)).toBe(1);
    expect(m.get("a")).toBe(1);
  });

  it("adds getOrInsert to Map when missing, inserting the given value if absent", () => {
    installMapUpsertPolyfill();
    const m = new Map<string, number>();
    expect(m.getOrInsert("a", 42)).toBe(42);
    expect(m.get("a")).toBe(42);
  });

  it("adds getOrInsertComputed to Map, only invoking the callback on a miss", () => {
    installMapUpsertPolyfill();
    const m = new Map<string, number>([["a", 1]]);
    let calls = 0;
    const hit = m.getOrInsertComputed("a", () => {
      calls += 1;
      return 999;
    });
    expect(hit).toBe(1);
    expect(calls).toBe(0);

    const miss = m.getOrInsertComputed("b", () => {
      calls += 1;
      return 2;
    });
    expect(miss).toBe(2);
    expect(calls).toBe(1);
    expect(m.get("b")).toBe(2);
  });

  it("adds the same methods to WeakMap", () => {
    installMapUpsertPolyfill();
    const key = {};
    const wm = new WeakMap<object, string>();
    expect(wm.getOrInsertComputed(key, () => "computed")).toBe("computed");
    expect(wm.getOrInsert(key, "unused")).toBe("computed");
  });

  it("does not override an already-native implementation", () => {
    const nativeImpl = function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
      if (!this.has(key)) this.set(key, value);
      return this.get(key);
    };
    Map.prototype.getOrInsert = nativeImpl;
    installMapUpsertPolyfill();
    expect(Map.prototype.getOrInsert).toBe(nativeImpl);
  });

  it("is safe to call more than once", () => {
    installMapUpsertPolyfill();
    installMapUpsertPolyfill();
    const m = new Map<string, number>();
    expect(m.getOrInsert("x", 1)).toBe(1);
  });
});

// This environment's Node/V8 already has the real toHex/fromHex/toBase64/
// fromBase64 methods, so these tests delete them first to simulate the
// actual production failure (2026-08-08,
// `{"stage":"UnknownErrorException","message":"a.toHex is not a function"}`)
// and confirm the polyfill both fills the gap and defers to a native
// implementation when one already exists.
describe("installMapUpsertPolyfill — Uint8Array hex/base64", () => {
  let originalToHex: unknown;
  let originalFromHex: unknown;
  let originalSetFromHex: unknown;
  let originalToBase64: unknown;
  let originalFromBase64: unknown;
  let originalSetFromBase64: unknown;

  beforeEach(() => {
    originalToHex = Uint8Array.prototype.toHex;
    originalFromHex = Uint8Array.fromHex;
    originalSetFromHex = Uint8Array.prototype.setFromHex;
    originalToBase64 = Uint8Array.prototype.toBase64;
    originalFromBase64 = Uint8Array.fromBase64;
    originalSetFromBase64 = Uint8Array.prototype.setFromBase64;
    delete (Uint8Array.prototype as unknown as Record<string, unknown>).toHex;
    delete (Uint8Array as unknown as Record<string, unknown>).fromHex;
    delete (Uint8Array.prototype as unknown as Record<string, unknown>).setFromHex;
    delete (Uint8Array.prototype as unknown as Record<string, unknown>).toBase64;
    delete (Uint8Array as unknown as Record<string, unknown>).fromBase64;
    delete (Uint8Array.prototype as unknown as Record<string, unknown>).setFromBase64;
  });

  afterEach(() => {
    Uint8Array.prototype.toHex = originalToHex as typeof Uint8Array.prototype.toHex;
    Uint8Array.fromHex = originalFromHex as typeof Uint8Array.fromHex;
    Uint8Array.prototype.setFromHex = originalSetFromHex as typeof Uint8Array.prototype.setFromHex;
    Uint8Array.prototype.toBase64 = originalToBase64 as typeof Uint8Array.prototype.toBase64;
    Uint8Array.fromBase64 = originalFromBase64 as typeof Uint8Array.fromBase64;
    Uint8Array.prototype.setFromBase64 = originalSetFromBase64 as typeof Uint8Array.prototype.setFromBase64;
  });

  it("adds toHex, producing lowercase hex for a byte sequence", () => {
    installMapUpsertPolyfill();
    const bytes = new Uint8Array([0, 255, 16, 9]);
    expect(bytes.toHex()).toBe("00ff1009");
  });

  it("adds the static fromHex, round-tripping with toHex", () => {
    installMapUpsertPolyfill();
    const bytes = Uint8Array.fromHex("00ff1009");
    expect(Array.from(bytes)).toEqual([0, 255, 16, 9]);
  });

  it("fromHex rejects an odd-length or non-hex string", () => {
    installMapUpsertPolyfill();
    expect(() => Uint8Array.fromHex("abc")).toThrow(SyntaxError);
    expect(() => Uint8Array.fromHex("zz")).toThrow(SyntaxError);
  });

  it("adds setFromHex, writing into an existing buffer and reporting read/written", () => {
    installMapUpsertPolyfill();
    const target = new Uint8Array(2);
    const result = target.setFromHex("00ff1009");
    expect(Array.from(target)).toEqual([0, 255]);
    expect(result).toEqual({ read: 4, written: 2 });
  });

  it("adds toBase64/fromBase64, round-tripping arbitrary bytes", () => {
    installMapUpsertPolyfill();
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    const encoded = bytes.toBase64();
    expect(encoded).toBe("SGVsbG8=");
    expect(Array.from(Uint8Array.fromBase64(encoded))).toEqual([72, 101, 108, 108, 111]);
  });

  it("does not override an already-native toHex implementation", () => {
    const nativeImpl = function (this: Uint8Array) {
      return "native";
    };
    Uint8Array.prototype.toHex = nativeImpl;
    installMapUpsertPolyfill();
    expect(Uint8Array.prototype.toHex).toBe(nativeImpl);
  });

  it("is safe to call more than once", () => {
    installMapUpsertPolyfill();
    installMapUpsertPolyfill();
    const bytes = new Uint8Array([1, 2, 3]);
    expect(bytes.toHex()).toBe("010203");
  });
});
