// Server-side PDF text extraction using pdfjs-dist's legacy (Node-safe)
// build. Only needs getTextContent(), not canvas rendering, so it runs fine
// in a Vercel serverless function.
//
// pdfjs-dist checks `globalThis.DOMMatrix` at module-eval time and, if it's
// missing, tries to `require("@napi-rs/canvas")` for a native polyfill (see
// its Node-only setup block). That optional native binary reliably fails to
// get traced into Vercel's serverless function bundle — it works fine in a
// plain local Node script, but crashes the deployed route with
// "DOMMatrix is not defined". We only need getTextContent(), not real
// canvas rendering, so a small pure-JS polyfill sidesteps the native
// dependency entirely and is bundler-safe. It must be set *before*
// pdfjs-dist is imported, so this uses a dynamic import rather than a
// static one (static imports are hoisted ahead of this file's own code).
import DOMMatrixPolyfill from "@thednp/dommatrix";

if (typeof globalThis.DOMMatrix === "undefined") {
  // @ts-expect-error - pure-JS shim; API-compatible enough for pdfjs's text-position matrix math.
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

export async function extractPdfText(bytes: Buffer, maxChars = 12000): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await loadingTask.promise;

  let text = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (text.length >= maxChars) break;
    // One malformed page (a broken embedded font, an unusual content stream
    // — real-world PDFs, especially complex multi-column academic/technical
    // papers with figures, occasionally have one) used to fail the entire
    // extraction and surface as "Could not read this document" even though
    // every other page was perfectly readable. Skip just the bad page and
    // keep going instead.
    try {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      text += pageText + "\n\n";
    } catch (err) {
      console.error(`PDF text extraction failed on page ${pageNum}, skipping`, err);
    }
  }

  return text.slice(0, maxChars).trim();
}
