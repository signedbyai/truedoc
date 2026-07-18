import React from "react";

// The signer-facing "What am I signing?" summary comes back as light
// markdown (the model emits **bold** emphasis, occasional bullet lists, and
// paragraph breaks). Rendering it as a raw string showed the literal
// asterisks in the modal — this turns that light markdown into React nodes
// without dangerouslySetInnerHTML (the text is model output, so no raw HTML
// is ever injected). Deliberately minimal: bold, italic, bullets, and
// paragraph/line breaks — nothing that needs a full markdown parser.

// Split a single line of text on **bold** and *italic* / _italic_ runs.
export function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Bold first (** or __), then italic (single * or _). Non-greedy, must
  // have non-space content between the markers.
  const pattern = /(\*\*|__)(.+?)\1|(\*|_)(?!\s)(.+?)(?<!\s)\3/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Strip a leading markdown bullet or heading marker from a line, returning
// the cleaned text and whether the line is a bullet.
function classifyLine(raw: string): { text: string; bullet: boolean } {
  const line = raw.trim();
  const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
  if (bulletMatch) return { text: bulletMatch[1], bullet: true };
  const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
  if (headingMatch) return { text: headingMatch[1], bullet: false };
  return { text: line, bullet: false };
}

export function SummaryMarkdown({ text }: { text: string }) {
  const rawLines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    const items = bulletBuffer;
    bulletBuffer = [];
    blocks.push(
      <ul key={key++} className="my-1 list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{parseInline(item)}</li>
        ))}
      </ul>
    );
  };

  for (const raw of rawLines) {
    if (raw.trim() === "") {
      flushBullets();
      continue;
    }
    const { text: lineText, bullet } = classifyLine(raw);
    if (bullet) {
      bulletBuffer.push(lineText);
    } else {
      flushBullets();
      blocks.push(
        <p key={key++} className="my-1 first:mt-0 last:mb-0">
          {parseInline(lineText)}
        </p>
      );
    }
  }
  flushBullets();

  return <>{blocks}</>;
}
