// Loaded in place of pdf.worker.min.mjs directly (see GlobalWorkerOptions
// .workerSrc in signing-view.tsx, field-editor.tsx, badge-placer.tsx, and
// embedded-pdf-preview.tsx). pdf.js has been progressively adopting very-new
// JS built-ins internally with no fallback for a browser that doesn't have
// them yet. This file polyfills two separate instances of that same shape —
// keep in sync with the main-thread version: src/lib/pdfjs-map-polyfill.ts,
// which has the full history/reasoning in its own comments.
//
// 1. Map/WeakMap.prototype.getOrInsert(Computed) — confirmed in production
//    (2026-07-26): iOS Safari 18.7.8 throws "getOrInsertComputed is not a
//    function" deterministically, on every load attempt, inside
//    worker-thread pdf.js code as well as the main thread.
//
// 2. Uint8Array.prototype/static toHex/fromHex/setFromHex and
//    toBase64/fromBase64/setFromBase64 — confirmed in production
//    (2026-08-08): `{"stage":"UnknownErrorException","message":"a.toHex is
//    not a function"}`. Only toHex has been observed failing so far, but all
//    six methods in this proposal ship together as one browser feature, so
//    all six are polyfilled here rather than just the one that happened to
//    crash first.
//
// pdf.worker.min.mjs is a manually-vendored static copy of
// node_modules/pdfjs-dist/build/pdf.worker.min.mjs (not built/copied
// automatically — see next.config.ts) and WILL be silently overwritten by
// any future re-vendoring. Keeping the polyfill in this separate wrapper
// file, rather than editing pdf.worker.min.mjs directly, means that future
// re-vendoring can't silently drop the fix.
for (const Ctor of [
  typeof Map !== "undefined" ? Map : undefined,
  typeof WeakMap !== "undefined" ? WeakMap : undefined,
]) {
  if (!Ctor) continue;

  if (typeof Ctor.prototype.getOrInsert !== "function") {
    Ctor.prototype.getOrInsert = function (key, value) {
      if (!this.has(key)) this.set(key, value);
      return this.get(key);
    };
  }

  if (typeof Ctor.prototype.getOrInsertComputed !== "function") {
    Ctor.prototype.getOrInsertComputed = function (key, callbackfn) {
      if (!this.has(key)) this.set(key, callbackfn(key));
      return this.get(key);
    };
  }
}

if (typeof Uint8Array !== "undefined") {
  function hexToByte(hex, offset) {
    const byte = Number.parseInt(hex.slice(offset, offset + 2), 16);
    return Number.isNaN(byte) ? undefined : byte;
  }

  if (typeof Uint8Array.prototype.toHex !== "function") {
    Uint8Array.prototype.toHex = function () {
      let hex = "";
      for (let i = 0; i < this.length; i++) hex += this[i].toString(16).padStart(2, "0");
      return hex;
    };
  }

  if (typeof Uint8Array.fromHex !== "function") {
    Uint8Array.fromHex = function (hex) {
      if (typeof hex !== "string" || hex.length % 2 !== 0) throw new SyntaxError("Invalid hex string");
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        const byte = hexToByte(hex, i * 2);
        if (byte === undefined) throw new SyntaxError("Invalid hex string");
        bytes[i] = byte;
      }
      return bytes;
    };
  }

  if (typeof Uint8Array.prototype.setFromHex !== "function") {
    Uint8Array.prototype.setFromHex = function (hex) {
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
    };
  }

  if (typeof Uint8Array.prototype.toBase64 !== "function") {
    Uint8Array.prototype.toBase64 = function () {
      let binary = "";
      for (let i = 0; i < this.length; i++) binary += String.fromCharCode(this[i]);
      return btoa(binary);
    };
  }

  if (typeof Uint8Array.fromBase64 !== "function") {
    Uint8Array.fromBase64 = function (base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };
  }

  if (typeof Uint8Array.prototype.setFromBase64 !== "function") {
    Uint8Array.prototype.setFromBase64 = function (base64) {
      const binary = atob(base64);
      const written = Math.min(binary.length, this.length);
      for (let i = 0; i < written; i++) this[i] = binary.charCodeAt(i);
      return { read: base64.length, written };
    };
  }
}

import("./pdf.worker.min.mjs");
