// Measured evaluation against the hand-labelled reference set.
//
//   npx tsx scripts/eval.ts --set dev  --provider gemini --repeats 1
//   npx tsx scripts/eval.ts --set test --provider gemini --repeats 3 --baseline
//
// Reads data/messages.jsonl and data/split.json. Writes results/<run>.json and
// results/<run>.md. Never tune prompts or weights on --set test.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, type AnalysisResult } from "../src/lib/analyze";
import { providerFromEnv, type Provider } from "../src/lib/providers";
import { mockProvider } from "../src/lib/mockProvider";
import {
  BASELINE_JSON_SCHEMA,
  BaselineOutput,
} from "../src/lib/schema";
import { BASELINE_SYSTEM_PROMPT, baselineUserText, PROMPT_VERSION } from "../src/lib/prompt";
import { TACTIC_IDS, type TacticId } from "../src/lib/tactics";

interface Item {
  id: string;
  class: "scam" | "genuine";
  text: string;
  language: string;
  type: string;
  tactics: TacticId[];
  verbatim: boolean;
}

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "true";
}

const setName = arg("set", "dev")!;
const providerName = arg("provider", "gemini")!;
const repeats = Number(arg("repeats", "1"));
const withBaseline = arg("baseline") === "true";
const limit = Number(arg("limit", "0"));
const delayMs = Number(arg("delay", "1500")); // stay inside free-tier rate limits

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadItems(): Item[] {
  const all: Item[] = readFileSync("data/messages.jsonl", "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const split: Record<string, string[]> = JSON.parse(readFileSync("data/split.json", "utf8"));
  const ids = new Set(split[setName] ?? []);
  if (ids.size === 0) throw new Error(`No ids for set "${setName}" in data/split.json`);
  const items = all.filter((x) => ids.has(x.id) && x.verbatim !== false);
  return limit > 0 ? items.slice(0, limit) : items;
}

function getProvider(): Provider {
  if (providerName === "mock") return mockProvider();
  const p = providerFromEnv(providerName);
  if (!p) throw new Error(`Provider "${providerName}" is not configured. Set its API key in .env.local`);
  return p;
}

async function baseline(provider: Provider, text: string): Promise<boolean | null> {
  try {
    const res = await provider.call({
      system: BASELINE_SYSTEM_PROMPT,
      userText: baselineUserText(text),
      jsonSchema: BASELINE_JSON_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "baseline",
    });
    const parsed = BaselineOutput.safeParse(JSON.parse(res.rawText));
    return parsed.success ? parsed.data.is_scam : null;
  } catch {
    return null;
  }
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);

async function main() {
  const items = loadItems();
  const provider = getProvider();
  console.log(`Set ${setName}: ${items.length} messages · ${provider.name}/${provider.model} · ${repeats} repeat(s)`);

  const rows: {
    id: string;
    cls: Item["class"];
    expected: TacticId[];
    runs: AnalysisResult[];
    baseline: (boolean | null)[];
  }[] = [];

  for (const item of items) {
    const runs: AnalysisResult[] = [];
    const base: (boolean | null)[] = [];
    for (let r = 0; r < repeats; r++) {
      runs.push(await analyze({ text: item.text }, provider));
      await sleep(delayMs);
      if (withBaseline) {
        base.push(await baseline(provider, item.text));
        await sleep(delayMs);
      }
    }
    rows.push({ id: item.id, cls: item.class, expected: item.tactics, runs, baseline: base });
    const v = runs.map((x) => x.verdict.verdict).join(",");
    process.stdout.write(`${item.id} ${item.class.padEnd(7)} ${v}\n`);
  }

  // ---- metrics (first run unless stated) ----
  const first = rows.map((r) => ({ ...r, res: r.runs[0] }));
  const scams = first.filter((r) => r.cls === "scam");
  const genuine = first.filter((r) => r.cls === "genuine");
  const flagged = (v: string) => v === "scam_signs";
  const flaggedOrCaution = (v: string) => v === "scam_signs" || v === "some_signs";

  const scamCaught = scams.filter((r) => flagged(r.res.verdict.verdict)).length;
  const scamCaughtOrCaution = scams.filter((r) => flaggedOrCaution(r.res.verdict.verdict)).length;
  const genuineFlagged = genuine.filter((r) => flagged(r.res.verdict.verdict)).length;
  const cantTell = first.filter((r) => r.res.verdict.verdict === "cant_tell").length;
  const saidNoSignsOnScam = scams.filter((r) => r.res.verdict.verdict === "no_known_signs").length;

  // tactic-level agreement with the labels
  const perTactic = Object.fromEntries(TACTIC_IDS.map((t) => [t, { tp: 0, fp: 0, fn: 0 }]));
  for (const r of first) {
    const got = new Set(r.res.findings.map((f) => f.tactic));
    const want = new Set(r.expected);
    for (const t of TACTIC_IDS) {
      if (got.has(t) && want.has(t)) perTactic[t].tp++;
      else if (got.has(t)) perTactic[t].fp++;
      else if (want.has(t)) perTactic[t].fn++;
    }
  }

  // grounding: how many model quotes were found in the text
  let kept = 0;
  let dropped = 0;
  for (const r of rows) for (const run of r.runs) {
    kept += run.findings.length;
    dropped += run.droppedFindings.length;
  }

  // repeat agreement: same verdict and same tactic set on every run
  const repeatSame = rows.filter((r) => {
    const keys = r.runs.map((x) => `${x.verdict.verdict}|${x.findings.map((f) => f.tactic).sort().join(",")}`);
    return keys.every((k) => k === keys[0]);
  }).length;

  const latencies = rows.flatMap((r) => r.runs.map((x) => x.meta.latencyMs ?? 0)).filter((x) => x > 0).sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;

  let baselineLines: string[] = [];
  if (withBaseline) {
    const b = rows.map((r) => ({ cls: r.cls, v: r.baseline[0] }));
    const bScam = b.filter((x) => x.cls === "scam");
    const bGen = b.filter((x) => x.cls === "genuine");
    const bInvalid = b.filter((x) => x.v === null).length;
    baselineLines = [
      `| Plain "is this a scam?" prompt | ${pct(bScam.filter((x) => x.v === true).length, bScam.length)} | ${pct(bGen.filter((x) => x.v === true).length, bGen.length)} | no explanation | invalid answers: ${bInvalid} |`,
    ];
  }

  const runId = `${setName}-${provider.name}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const md = [
    `# Evaluation: ${setName} set`,
    "",
    `- Run: ${runId}`,
    `- Model: ${provider.name} / ${provider.model} · prompt ${PROMPT_VERSION} · temperature 0`,
    `- Messages: ${items.length} (${scams.length} scam, ${genuine.length} genuine) · repeats: ${repeats}`,
    "",
    "## Verdicts (first run)",
    "",
    "| Pipeline | Scams flagged | Genuine wrongly flagged | Explains why | Notes |",
    "|---|---|---|---|---|",
    `| Semak Mesej (rubric + quote check + rules) | ${pct(scamCaught, scams.length)} | ${pct(genuineFlagged, genuine.length)} | yes, quoted phrases | scams marked caution or worse: ${pct(scamCaughtOrCaution, scams.length)} |`,
    ...baselineLines,
    "",
    `- Scams that got "no known tactics": ${saidNoSignsOnScam} of ${scams.length}`,
    `- "Can't tell" answers: ${cantTell}`,
    `- Quotes found in the message (kept): ${kept}; not found (dropped): ${dropped} (${pct(dropped, kept + dropped)} dropped)`,
    `- Same verdict and tactics on every repeat: ${repeatSame} of ${rows.length}`,
    `- Median latency: ${median} ms`,
    "",
    "## Tactic agreement with labels (first run)",
    "",
    "| Tactic | Precision | Recall | TP | FP | FN |",
    "|---|---|---|---|---|---|",
    ...TACTIC_IDS.map((t) => {
      const { tp, fp, fn } = perTactic[t];
      return `| ${t} | ${pct(tp, tp + fp)} | ${pct(tp, tp + fn)} | ${tp} | ${fp} | ${fn} |`;
    }),
    "",
    "## Errors to read by hand",
    "",
    ...first
      .filter((r) => (r.cls === "scam" && !flagged(r.res.verdict.verdict)) || (r.cls === "genuine" && flagged(r.res.verdict.verdict)))
      .map((r) => `- ${r.id} (${r.cls}): got ${r.res.verdict.verdict}, tactics [${r.res.findings.map((f) => f.tactic).join(", ")}], expected [${r.expected.join(", ")}]`),
  ].join("\n");

  mkdirSync("results", { recursive: true });
  writeFileSync(`results/${runId}.json`, JSON.stringify({ runId, setName, provider: provider.name, model: provider.model, repeats, rows }, null, 2));
  writeFileSync(`results/${runId}.md`, md);
  console.log(`\n${md}\n\nSaved results/${runId}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
