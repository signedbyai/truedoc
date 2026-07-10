export type ParsedRecipient = { name: string | null; email: string };

// Accepts lines like "jane@company.com" or "Jane Doe <jane@company.com>" —
// used by the bulk-send textarea to turn a pasted list into recipients.
export function parseRecipients(text: string): ParsedRecipient[] {
  const recipients: ParsedRecipient[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const angleMatch = line.match(/^(.*)<([^>]+)>$/);
    if (angleMatch) {
      const name = angleMatch[1].trim();
      const email = angleMatch[2].trim();
      if (email) recipients.push({ name: name || null, email });
    } else {
      recipients.push({ name: null, email: line });
    }
  }
  return recipients;
}
