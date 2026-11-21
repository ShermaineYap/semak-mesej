// The full pipeline: precheck -> one model call -> quote check -> rule verdict.

import { extractIdentifiers, type Identifiers } from "./extract";
import { precheckText, type CantTellReason } from "./precheck";
import { MODEL_OUTPUT_JSON_SCHEMA, ModelOutput, type ModelFinding } from "./schema";
import { RUBRIC_SYSTEM_PROMPT, rubricUserText, PROMPT_VERSION } from "./prompt";
import { ProviderError, type Provider } from "./providers";
import { locateQuote, type Span } from "./verify";
import { cantTell, decideVerdict, type VerdictResult } from "./verdict";
import type { TacticId } from "./tactics";

export interface VerifiedFinding {
  tactic: TacticId;
  quote: string;
  span: Span;
  explanation: { en: string; ms: string };
}

export interface AnalysisResult {
  verdict: VerdictResult;
  /** The text that highlights point into: pasted text, or the screenshot transcript. */
  text: string;
  source: "text" | "image";
  findings: VerifiedFinding[];
  /** Findings dropped because their quote was not found in the message. */
  droppedFindings: { tactic: TacticId; quote: string }[];
  identifiers: Identifiers;
  meta: {
    language?: string;
    messageKind?: string;
    claimedSender?: string;
    readability?: string;
    model?: string;
    latencyMs?: number;
    attempts: number;
    promptVersion: string;
  };
}

export interface AnalyzeInput {
  text?: string;
  image?: { mimeType: string; base64: string };
}

function emptyResult(
  reason: CantTellReason,
  text: string,
  source: "text" | "image",
  identifiers: Identifiers,
  attempts = 0,
): AnalysisResult {
  return {
    verdict: cantTell(reason),
    text,
    source,
    findings: [],
    droppedFindings: [],
    identifiers,
    meta: { attempts, promptVersion: PROMPT_VERSION },
  };
}

/** Keep findings whose quote is really in the text; one per tactic. */
export function verifyFindings(
  text: string,
  findings: ModelFinding[],
): { kept: VerifiedFinding[]; dropped: { tactic: TacticId; quote: string }[] } {
  const kept: VerifiedFinding[] = [];
  const dropped: { tactic: TacticId; quote: string }[] = [];
  const seen = new Set<TacticId>();
  for (const f of findings) {
    if (seen.has(f.tactic)) continue;
    const span = locateQuote(text, f.quote);
    if (!span) {
      dropped.push({ tactic: f.tactic, quote: f.quote });
      continue;
    }
    seen.add(f.tactic);
    kept.push({
      tactic: f.tactic,
      quote: text.slice(span.start, span.end),
      span,
      explanation: { en: f.explanation_en, ms: f.explanation_ms },
    });
  }
  return { kept, dropped };
}

const MAX_ATTEMPTS = 2;

export async function analyze(
  input: AnalyzeInput,
  provider: Provider,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const source: "text" | "image" = input.image ? "image" : "text";
  const pasted = (input.text ?? "").trim();

  if (source === "text") {
    const pre = precheckText(pasted);
    if (!pre.ok) return emptyResult(pre.reason, pasted, source, pre.identifiers);
  }

  let parsed: ModelOutput | null = null;
  let attempts = 0;
  let model: string | undefined;
  let latencyMs: number | undefined;
  while (attempts < MAX_ATTEMPTS && !parsed) {
    attempts++;
    try {
      const res = await provider.call(
        {
          system: RUBRIC_SYSTEM_PROMPT,
          userText: rubricUserText(source === "text" ? pasted : null),
          image: input.image,
          jsonSchema: MODEL_OUTPUT_JSON_SCHEMA as unknown as Record<string, unknown>,
          schemaName: "message_tactics",
        },
        signal,
      );
      model = res.model;
      latencyMs = res.latencyMs;
      const json = JSON.parse(res.rawText);
      const check = ModelOutput.safeParse(json);
      if (check.success) parsed = check.data;
    } catch (e) {
      // Server log for diagnosing failures. Never includes the API key.
      console.warn(`[analyze] attempt ${attempts} failed: ${e instanceof Error ? e.message.slice(0, 300) : String(e)}`);
      if (e instanceof ProviderError && e.kind !== "bad_response") {
        return emptyResult("model_unavailable", pasted, source, extractIdentifiers(pasted), attempts);
      }
      // JSON.parse failure or bad_response: retry once
    }
  }
  if (!parsed) {
    return emptyResult("invalid_model_output", pasted, source, extractIdentifiers(pasted), attempts);
  }

  // For screenshots the model's transcript becomes the text, and it must pass
  // the same checks as pasted text.
  let text = pasted;
  if (source === "image") {
    text = parsed.transcript.trim();
    if (parsed.readability === "unreadable" || text.length === 0) {
      return emptyResult("unreadable_image", text, source, extractIdentifiers(text), attempts);
    }
    const pre = precheckText(text);
    if (!pre.ok) return emptyResult(pre.reason, text, source, pre.identifiers, attempts);
  }

  const { kept, dropped } = verifyFindings(text, parsed.findings);
  return {
    verdict: decideVerdict(kept.map((k) => k.tactic)),
    text,
    source,
    findings: kept.sort((a, b) => a.span.start - b.span.start),
    droppedFindings: dropped,
    identifiers: extractIdentifiers(text),
    meta: {
      language: parsed.language,
      messageKind: parsed.message_kind,
      claimedSender: parsed.claimed_sender,
      readability: parsed.readability,
      model,
      latencyMs,
      attempts,
      promptVersion: PROMPT_VERSION,
    },
  };
}
