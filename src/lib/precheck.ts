// Input checks that run BEFORE any AI call. Each one is a safe failure:
// the user gets a "can't tell" answer and a next step, never "safe".

import { extractIdentifiers, stripIdentifiers, type Identifiers } from "./extract";

export type CantTellReason =
  | "too_short"
  | "identifier_only"
  | "unsupported_language"
  | "too_long"
  | "unreadable_image"
  | "model_unavailable"
  | "invalid_model_output";

export const MIN_CHARS = 15;
export const MIN_WORDS = 4;
export const MAX_CHARS = 4000;

// Scripts this version has been tested on: Latin (Malay/English) and Han (Chinese).
// Tamil, Jawi, Thai etc. are refused honestly until they are in the test set.
const LATIN = /\p{Script=Latin}/u;
const HAN = /\p{Script=Han}/u;
const LETTER = /\p{L}/u;

export function wordCount(s: string): number {
  // Each Han character counts as a word; elsewhere split on spaces
  const han = [...s].filter((c) => HAN.test(c)).length;
  const latinWords = s
    .replace(/\p{Script=Han}/gu, " ")
    .split(/\s+/)
    .filter((w) => /\p{L}{2,}/u.test(w)).length;
  return latinWords + Math.floor(han / 2);
}

export function supportedScriptShare(s: string): number {
  let letters = 0;
  let ok = 0;
  for (const c of s) {
    if (!LETTER.test(c)) continue;
    letters++;
    if (LATIN.test(c) || HAN.test(c)) ok++;
  }
  return letters === 0 ? 1 : ok / letters;
}

export type PrecheckResult =
  | { ok: true; identifiers: Identifiers }
  | { ok: false; reason: CantTellReason; identifiers: Identifiers };

export function precheckText(raw: string): PrecheckResult {
  const text = raw.trim();
  const identifiers = extractIdentifiers(text);
  if (text.length > MAX_CHARS) return { ok: false, reason: "too_long", identifiers };

  const rest = stripIdentifiers(text, identifiers);
  const hasIds =
    identifiers.phones.length + identifiers.accounts.length + identifiers.links.length > 0;
  if (hasIds && wordCount(rest) < MIN_WORDS) {
    return { ok: false, reason: "identifier_only", identifiers };
  }
  if (text.length < MIN_CHARS || wordCount(text) < MIN_WORDS) {
    return { ok: false, reason: "too_short", identifiers };
  }
  if (supportedScriptShare(text) < 0.7) {
    return { ok: false, reason: "unsupported_language", identifiers };
  }
  return { ok: true, identifiers };
}
