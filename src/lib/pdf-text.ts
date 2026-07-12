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

export type PositionedTextItem = {
  page: number;
  str: string;
  x: number; // 0-1, fraction of page width, left edge, top-left origin
  y: number; // 0-1, fraction of page height, top edge, top-left origin
};

// Like extractPdfText, but keeps each text run's position instead of
// discarding it — used by suggest-fields.ts to give Claude something to
// reason about ("there's a blank at roughly (x, y) right after the word
// 'Signature:'"). pdfjs's raw item.transform is in PDF space (origin at the
// page's bottom-left, y increasing upward); combining it with the page's
// viewport transform (via pdfjs's own Util.transform) converts it into the
// same top-left-origin, y-down space the field editor already uses for
// click coordinates, so a suggested (x, y) lines up with the app's existing
// normalized field coordinates with no extra conversion needed downstream.
export async function extractPdfTextPositions(
  bytes: Buffer,
  maxPages = 20,
  maxItems = 2500
): Promise<PositionedTextItem[]> {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await loadingTask.promise;

  const items: PositionedTextItem[] = [];
  const pageLimit = Math.min(pdf.numPages, maxPages);

  for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
    if (items.length >= maxItems) break;
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str.trim()) continue;
        const tx = Util.transform(viewport.transform, raw.transform);
        items.push({
          page: pageNum,
          str: raw.str.trim(),
          x: Math.min(Math.max(tx[4] / viewport.width, 0), 1),
          y: Math.min(Math.max(tx[5] / viewport.height, 0), 1),
        });
        if (items.length >= maxItems) break;
      }
    } catch (err) {
      console.error(`Positioned text extraction failed on page ${pageNum}, skipping`, err);
    }
  }

  return items;
}
