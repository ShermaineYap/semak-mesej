// The verdict is a rule table over VERIFIED findings. The model never decides it.

import { TACTICS, type TacticId } from "./tactics";
import type { CantTellReason } from "./precheck";

export type Verdict = "scam_signs" | "some_signs" | "no_known_signs" | "cant_tell";

/** Thresholds are tuned on the development set only, never on the test set. */
export const SCAM_THRESHOLD = 4;

export interface VerdictResult {
  verdict: Verdict;
  score: number;
  reason?: CantTellReason;
}

export function scoreTactics(tactics: Iterable<TacticId>): number {
  const seen = new Set(tactics);
  let score = 0;
  for (const t of seen) score += TACTICS[t].weight;
  return score;
}

export function decideVerdict(verifiedTactics: TacticId[]): VerdictResult {
  const score = scoreTactics(verifiedTactics);
  if (score >= SCAM_THRESHOLD) return { verdict: "scam_signs", score };
  if (score > 0) return { verdict: "some_signs", score };
  // Zero signs is NOT "safe": the UI must say so.
  return { verdict: "no_known_signs", score };
}

export function cantTell(reason: CantTellReason): VerdictResult {
  return { verdict: "cant_tell", score: 0, reason };
}
