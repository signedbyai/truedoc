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
