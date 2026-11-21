// Deterministic extraction of identifiers that existing tools can check.
// Phone numbers and account numbers go to Semak Mule; links are flagged.

export interface Identifiers {
  links: string[];
  phones: string[];
  accounts: string[];
}

// Links, including "defanged" ones such as pos-my[.]top
const LINK_RE =
  /\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9][a-z0-9-]{1,62}(?:\.|\[\.\])(?:[a-z0-9-]{1,62}(?:\.|\[\.\]))*(?:com|my|net|org|top|xyz|cc|vip|info|site|online|shop|link|live|app|io|co|me|biz|club|icu|cn|asia)\b(?:\/[^\s<>"')]*)?/gi;

// Malaysian phone numbers: 01x-xxx xxxx, +6012..., 03-xxxx xxxx
const PHONE_RE = /(?:\+?6)?0(?:1\d|[3-9])[\s-]?\d{3,4}[\s-]?\d{4}\b/g;

// Account-like digit runs (10-16 digits, optional spaces or dashes)
const ACCOUNT_RE = /\b\d(?:[\s-]?\d){9,15}\b/g;

function uniq(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()))].filter(Boolean);
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

export function extractIdentifiers(text: string): Identifiers {
  const links = uniq(text.match(LINK_RE) ?? []).map((l) =>
    l.replace(/[.,;:!?]+$/, ""),
  );
  const phones = uniq(text.match(PHONE_RE) ?? []);
  const phoneDigits = new Set(phones.map(digits));
  const accounts = uniq(text.match(ACCOUNT_RE) ?? []).filter((a) => {
    const d = digits(a);
    if (phoneDigits.has(d)) return false;
    // A phone number with country code also matches the account pattern
    for (const p of phoneDigits) if (d.endsWith(p) || p.endsWith(d)) return false;
    return d.length >= 10;
  });
  return { links: uniq(links), phones, accounts };
}

/** Text left after removing identifiers, used to detect "number only" input. */
export function stripIdentifiers(text: string, ids: Identifiers): string {
  let rest = text;
  for (const x of [...ids.links, ...ids.phones, ...ids.accounts]) {
    rest = rest.split(x).join(" ");
  }
  return rest;
}
