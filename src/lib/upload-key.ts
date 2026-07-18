// R2 object-key helpers for the presigned direct-to-R2 upload flow. Kept pure
// (no SDK/Supabase) so the security-sensitive key checks are unit-testable.
//
// The upload is two server calls around a direct browser->R2 PUT: (1)
// /api/documents/upload-url issues a presigned URL for a server-chosen key,
// (2) /api/documents finalizes it. Because the client hands the key back at
// finalize, the key MUST be validated against the caller's org + the
// server-issued documentId — otherwise a caller could try to register an
// object under another org's prefix.

// Filenames end up as the last segment of the key. Strip path separators (so a
// name can't restructure the key or escape the prefix) and cap the length.
export function sanitizeUploadFilename(name: string): string {
  const cleaned = name.replace(/[/\\]/g, "_").replace(/\.\.+/g, ".").trim();
  return cleaned.slice(0, 200) || "document.pdf";
}

// The canonical key for a document's source PDF: <orgId>/<documentId>/<file>.
export function documentKey(orgId: string, documentId: string, filename: string): string {
  return `${orgId}/${documentId}/${sanitizeUploadFilename(filename)}`;
}

// True only if `key` is one this org + document is allowed to finalize: it must
// live under the exact <orgId>/<documentId>/ prefix and contain no traversal.
export function keyBelongsTo(orgId: string, documentId: string, key: string): boolean {
  if (!orgId || !documentId || !key) return false;
  if (key.includes("..")) return false;
  return key.startsWith(`${orgId}/${documentId}/`) && key.length > `${orgId}/${documentId}/`.length;
}
