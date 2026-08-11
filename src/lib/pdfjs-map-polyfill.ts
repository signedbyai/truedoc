// pdf.js (pdfjs-dist) has been progressively adopting very-new JS built-ins
// internally with no fallback for a browser that doesn't have them yet.
// Despite the filename (kept as-is so every existing call site/import didn't
// need touching), this now installs TWO separate fixes of that same shape:
//
// 1. Map/WeakMap.prototype.getOrInsert(Computed) (Mozilla's "Map upsert"
//    methods, only broadly supported across browsers since February 2026) —
//    see https://github.com/mozilla/pdf.js/issues/20680, where a pdf.js
//    maintainer confirms this exact failure and its cause.
//
//    Confirmed in production (2026-07-26, audit_events.client_load_error):
//    iOS Safari 18.7.8 throws "this.#rJ.getOrInsertComputed is not a
//    function" partway through loading every single document,
//    deterministically — not a network/timeout issue (which is why the
//    existing auto-retry never helped; retrying the same missing built-in
//    just fails the same way again instantly).
//
// 2. Uint8Array.prototype/static toHex/fromHex/setFromHex and
//    toBase64/fromBase64/setFromBase64 (the "Uint8Array to/from base64/hex"
//    TC39 proposal, same very-new-built-in rollout shape as Map upsert
//    above) — confirmed in production (2026-08-08,
//    audit_events.client_load_error): a handful of signers hit
//    `{"stage":"UnknownErrorException","message":"a.toHex is not a
//    function"}`, pdf.js's own wrapper exception around this exact missing
//    method. Only toHex has been observed failing so far, but all six
//    methods in this proposal ship together as one browser feature, so all
//    six are polyfilled here rather than just the one that happened to
//    crash first — same reasoning as polyfilling both Map upsert methods
//    above even though only getOrInsertComputed was ever observed to fail.
//
// Pinning pdfjs-dist to an older version isn't a durable fix for either:
// this dependency has gotten MORE pervasive across recent pdf.js releases,
// not less, so a future dependency bump could easily reintroduce either
// failure (or a new one shaped just like it). Supplying the missing methods
// ourselves, once, up front, is the fix that survives any pdf.js version.
//
// Must run before ANY pdfjs-dist code executes. Two separate places need
// it — the main thread (this file, imported by signing-view.tsx,
// field-editor.tsx, badge-placer.tsx, and embedded-pdf-preview.tsx before
// their `await import("pdfjs-dist")`) and the pdf.js worker, which is a
// separate, unbundled static file — see public/pdf.worker.polyfill.mjs,
// loaded in place of pdf.worker.min.mjs directly. Keep the two
// implementations in sync if this ever changes.
//
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
  interface Uint8Array {
    toHex(): string;
    toBase64(): string;
    setFromHex(hex: string): { read: number; written: number };
    setFromBase64(base64: string): { read: number; written: number };
  }
  interface Uint8ArrayConstructor {
    fromHex(hex: string): Uint8Array;
    fromBase64(base64: string): Uint8Array;
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

// Deliberately simple/defensive implementations — the job here is only to
// stop pdf.js's internal use from crashing, not to be a spec-perfect
// polyfill (no `alphabet: "base64url"` option support, no strict
// `lastChunkHandling`). pdf.js's own internal usage doesn't need any of that
// option surface.
function hexToByte(hex: string, offset: number): number | undefined {
  const byte = Number.parseInt(hex.slice(offset, offset + 2), 16);
  return Number.isNaN(byte) ? undefined : byte;
}

function polyfillUint8ArrayEncoding(): void {
  if (typeof Uint8Array === "undefined") return;
  const proto = Uint8Array.prototype as unknown as Record<string, unknown>;
  const ctor = Uint8Array as unknown as Record<string, unknown>;

  if (typeof proto.toHex !== "function") {
    Object.defineProperty(proto, "toHex", {
      value: function (this: Uint8Array) {
        let hex = "";
        for (let i = 0; i < this.length; i++) hex += this[i].toString(16).padStart(2, "0");
        return hex;
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof ctor.fromHex !== "function") {
    Object.defineProperty(ctor, "fromHex", {
      value: function (hex: string) {
        if (typeof hex !== "string" || hex.length % 2 !== 0) throw new SyntaxError("Invalid hex string");
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          const byte = hexToByte(hex, i * 2);
          if (byte === undefined) throw new SyntaxError("Invalid hex string");
          bytes[i] = byte;
        }
        return bytes;
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof proto.setFromHex !== "function") {
    Object.defineProperty(proto, "setFromHex", {
      value: function (this: Uint8Array, hex: string) {
        let read = 0;
        let written = 0;
        while (read + 2 <= hex.length && written < this.length) {
          const byte = hexToByte(hex, read);
          if (byte === undefined) break;
          this[written] = byte;
          read += 2;
          written += 1;
        }
        return { read, written };
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof proto.toBase64 !== "function") {
    Object.defineProperty(proto, "toBase64", {
      value: function (this: Uint8Array) {
        let binary = "";
        for (let i = 0; i < this.length; i++) binary += String.fromCharCode(this[i]);
        return btoa(binary);
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof ctor.fromBase64 !== "function") {
    Object.defineProperty(ctor, "fromBase64", {
      value: function (base64: string) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      },
      writable: true,
      configurable: true,
    });
  }

  if (typeof proto.setFromBase64 !== "function") {
    Object.defineProperty(proto, "setFromBase64", {
      value: function (this: Uint8Array, base64: string) {
        const binary = atob(base64);
        const written = Math.min(binary.length, this.length);
        for (let i = 0; i < written; i++) this[i] = binary.charCodeAt(i);
        return { read: base64.length, written };
      },
      writable: true,
      configurable: true,
    });
  }
}

export function installMapUpsertPolyfill(): void {
  if (typeof Map !== "undefined") polyfillUpsert(Map);
  if (typeof WeakMap !== "undefined") polyfillUpsert(WeakMap);
  polyfillUint8ArrayEncoding();
}
