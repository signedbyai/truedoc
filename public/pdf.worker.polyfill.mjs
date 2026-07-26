// Loaded in place of pdf.worker.min.mjs directly (see GlobalWorkerOptions
// .workerSrc in signing-view.tsx and field-editor.tsx). pdf.js has been
// progressively adopting Map/WeakMap.prototype.getOrInsert(Computed)
// internally (only broadly supported across browsers since February 2026)
// with no fallback for a browser that doesn't have them yet — see
// https://github.com/mozilla/pdf.js/issues/20680.
//
// Confirmed in production (2026-07-26): iOS Safari 18.7.8 throws
// "getOrInsertComputed is not a function" deterministically, on every load
// attempt, inside worker-thread pdf.js code as well as the main thread. This
// file polyfills the missing methods before the real worker
// (pdf.worker.min.mjs) runs.
//
// pdf.worker.min.mjs is a manually-vendored static copy of
// node_modules/pdfjs-dist/build/pdf.worker.min.mjs (not built/copied
// automatically — see next.config.ts) and WILL be silently overwritten by
// any future re-vendoring. Keeping the polyfill in this separate wrapper
// file, rather than editing pdf.worker.min.mjs directly, means that future
// re-vendoring can't silently drop the fix. Keep in sync with the main-thread
// version: src/lib/pdfjs-map-polyfill.ts.
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

import("./pdf.worker.min.mjs");
