// Server-side PDF text extraction using pdfjs-dist's legacy (Node-safe)
// build. Only needs getTextContent(), not canvas rendering, so it runs fine
// in a Vercel serverless function.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(bytes: Buffer, maxChars = 12000): Promise<string> {
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await loadingTask.promise;

  let text = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (text.length >= maxChars) break;
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    text += pageText + "\n\n";
  }

  return text.slice(0, maxChars).trim();
}
