// The document-hash length/format rule, kept out of route.ts so it stays
// unit-testable without importing the route (Next 16 disallows non-handler
// exports from a route file). Accepts either a 64-hex SHA-256 hash (every
// certificate issued before the SHA-512 switch) or a 128-hex SHA-512 hash.
export function isValidDocumentHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash) || /^[a-f0-9]{128}$/.test(hash);
}
