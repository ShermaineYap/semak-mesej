// Code-side grounding check: every phrase the model quotes must actually
// appear in the message. Unmatched quotes are dropped, never shown.

export interface Span {
  start: number;
  end: number; // exclusive
}

interface Normalized {
  norm: string;
  /** map[i] = index in the original string of normalized char i */
  map: number[];
}

const QUOTE_CHARS = /[‘’‚‛′]/g;
const DQUOTE_CHARS = /[“”„‟″]/g;

function canonChar(ch: string): string {
  return ch
    .normalize("NFKC")
    .replace(QUOTE_CHARS, "'")
    .replace(DQUOTE_CHARS, '"')
    .toLowerCase();
}

export function normalize(text: string): Normalized {
  let norm = "";
  const map: number[] = [];
  let lastWasSpace = true; // trims leading whitespace
  // Iterate by code point so emoji and CJK stay intact
  let i = 0;
  for (const ch of text) {
    const isSpace = /\s/u.test(ch) || ch === "​";
    if (isSpace) {
      if (!lastWasSpace) {
        norm += " ";
        map.push(i);
        lastWasSpace = true;
      }
    } else {
      const c = canonChar(ch);
      // One map entry per UTF-16 unit, because indexOf works in UTF-16 units
      for (let k = 0; k < c.length; k++) {
        norm += c[k];
        map.push(i);
      }
      lastWasSpace = false;
    }
    i += ch.length;
  }
  if (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map };
}

function cleanQuote(q: string): string {
  return q
    .trim()
    .replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "")
    .replace(/^(?:\.{3}|…)\s*|\s*(?:\.{3}|…)$/g, "")
    .trim();
}

const MIN_PART = 3;

/**
 * Find a model-quoted phrase in the original text.
 * Matching ignores case, repeated whitespace and curly-vs-straight quotes.
 * A quote with "..." in the middle matches if every part appears in order.
 * Returns the span in the ORIGINAL text, or null if not found.
 */
export function locateQuote(text: string, quote: string): Span | null {
  const cleaned = cleanQuote(quote);
  if (!cleaned) return null;
  const parts = cleaned
    .split(/\s*(?:\.{3}|…)\s*/)
    .map((p) => normalize(p).norm)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  if (parts.some((p) => p.length < MIN_PART)) return null;

  const { norm, map } = normalize(text);
  let from = 0;
  let start = -1;
  let endNorm = -1;
  for (const p of parts) {
    const idx = norm.indexOf(p, from);
    if (idx < 0) return null;
    if (start < 0) start = idx;
    endNorm = idx + p.length - 1;
    from = idx + p.length;
  }
  // A match must not start or end in the middle of a surrogate pair
  if (start > 0 && map[start - 1] === map[start]) return null;
  const origStart = map[start];
  const lastOrig = map[endNorm];
  // Extend to the end of the code point at lastOrig
  const cp = text.codePointAt(lastOrig) ?? 0;
  const origEnd = lastOrig + (cp > 0xffff ? 2 : 1);
  return { start: origStart, end: origEnd };
}
