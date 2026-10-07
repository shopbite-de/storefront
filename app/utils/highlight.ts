export type HighlightPart = { text: string; highlight: boolean };

/**
 * Splits a content title with the MDC highlight syntax used in
 * content/index.yml, "Alle [Informationen]{.text-primary} auf einen Blick",
 * into plain and highlighted parts (#444). Text without the syntax is one
 * plain part.
 */
export function splitHighlight(text: string): HighlightPart[] {
  const parts: HighlightPart[] = [];
  const pattern = /\[([^\]]+)\]\{[^}]*\}/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ text: text.slice(last, index), highlight: false });
    }
    parts.push({ text: match[1] ?? "", highlight: true });
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), highlight: false });
  }
  return parts;
}
