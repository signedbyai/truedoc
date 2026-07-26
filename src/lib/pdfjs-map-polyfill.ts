// pdf.js (pdfjs-dist) has been progressively adopting Map/WeakMap.prototype
// .getOrInsert(Computed) internally (Mozilla's "Map upsert" methods, only
// broadly supported across browsers since February 2026) with no fallback
// for a browser that doesn't have them yet — see
// https://github.com/mozilla/pdf.js/issues/20680, where a pdf.js maintainer
// confirms this exact failure and its cause.
//
// Confirmed in production (2026-07-26, audit_events.client_load_error):
// iOS Safari 18.7.8 throws "this.#rJ.getOrInsertComputed is not a function"
// partway through loading every single document, deterministically — not a
// network/timeout issue (which is why the existing auto-retry never helped;
// retrying the same missing built-in just fails the same way again
// instantly). Pinning pdfjs-dist to an older version isn't a durable fix
// either: this dependency has gotten MORE pervasive across recent pdf.js
// releases, not less, so a future dependency bump could easily reintroduce
// it. Supplying the missing methods ourselves, once, up front, is the fix
// that survives any pdf.js version.
//
// Must run before ANY pdfjs-dist code executes. Two separate places need
// it — the main thread (this file, imported by signing-view.tsx and
// field-editor.tsx before their `await import("pdfjs-dist")`) and the pdf.js
// worker, which is a separate, unbundled static file — see
// public/pdf.worker.polyfill.mjs, loaded in place of pdf.worker.min.mjs
// directly. Keep the two implementations in sync if this ever changes.
// This TypeScript lib target doesn't yet ship type declarations for these
// (very new) built-ins, so declare them ourselves rather than sprinkling
// `as any` everywhere they're used, here and in the accompanying test file.
declare global {
  interface Map<K, V> {
    getOrInsert(key: K, value: V): V;
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  }
  interface WeakMap<K extends WeakKey, V> {
    getOrInsert(key: K, value: V): V;
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  }
}

function polyfillUpsert(ctor: { prototype: object } | undefined): void {
  if (!ctor) return;
  const proto = ctor.prototype as Record<string, unknown>;

  if (typeof proto.getOrInsert !== "function") {
    Object.defineProperty(proto, "getOrInsert", {
      value: function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
        if (!this.has(key)) this.set(key, value);
        return this.get(key);
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof proto.getOrInsertComputed !== "function") {
    Object.defineProperty(proto, "getOrInsertComputed", {
      value: function (this: Map<unknown, unknown>, key: unknown, callbackfn: (key: unknown) => unknown) {
        if (!this.has(key)) this.set(key, callbackfn(key));
        return this.get(key);
      },
      writable: true,
      configurable: true,
    });
  }
}

export function installMapUpsertPolyfill(): void {
  if (typeof Map !== "undefined") polyfillUpsert(Map);
  if (typeof WeakMap !== "undefined") polyfillUpsert(WeakMap);
}
