// Screenshot evaluation: the same messages pasted vs uploaded as a chat screenshot.
//   python3 scripts/render_chats.py
//   npx tsx scripts/eval-screenshots.ts
// Writes results/screenshots-<time>.{json,md}

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, type AnalysisResult } from "../src/lib/analyze";
import { providerFromEnv } from "../src/lib/providers";

interface Shot {
  id: string;
  image: string;
  class: "scam" | "genuine";
  language: string;
  text: string;
  tactics: string[];
  hard: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const delayMs = Number(process.argv[process.argv.indexOf("--delay") + 1] || 1500);

// Character-level similarity between the model's transcript and the real text
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const x = [...norm(a)];
  const y = [...norm(b)];
  const prev = new Array(y.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length, 1);
}

async function main() {
  const provider = providerFromEnv();
  if (!provider) throw new Error("Set GEMINI_API_KEY");
  const shots: Shot[] = JSON.parse(readFileSync("data/screenshots/manifest.json", "utf8"));
  const rows: { shot: Shot; pasted: AnalysisResult; image: AnalysisResult; sim: number }[] = [];
  for (const shot of shots) {
    const pasted = await analyze({ text: shot.text }, provider);
    await sleep(delayMs);
    const base64 = readFileSync(shot.image).toString("base64");
    const image = await analyze({ image: { mimeType: "image/png", base64 } }, provider);
    await sleep(delayMs);
    const sim = image.text ? similarity(image.text, shot.text) : 0;
    rows.push({ shot, pasted, image, sim });
    console.log(
      `${shot.id.padEnd(15)} pasted=${pasted.verdict.verdict.padEnd(15)} image=${image.verdict.verdict.padEnd(15)} transcript=${(sim * 100).toFixed(0)}% tactics p/i=${pasted.findings.length}/${image.findings.length}`,
    );
  }

  const ok = (r: AnalysisResult) => r.verdict.verdict !== "cant_tell";
  const scams = rows.filter((r) => r.shot.class === "scam");
  const flagged = (r: AnalysisResult) => r.verdict.verdict === "scam_signs";
  const caution = (r: AnalysisResult) => r.verdict.verdict === "scam_signs" || r.verdict.verdict === "some_signs";
  const agree = rows.filter((r) => r.pasted.verdict.verdict === r.image.verdict.verdict).length;
  const sims = rows.filter((r) => ok(r.image)).map((r) => r.sim).sort((a, b) => a - b);
  const medianSim = sims.length ? sims[Math.floor(sims.length / 2)] : 0;
  const pTactics = rows.reduce((n, r) => n + r.pasted.findings.length, 0);
  const iTactics = rows.reduce((n, r) => n + r.image.findings.length, 0);
  const iDropped = rows.reduce((n, r) => n + r.image.droppedFindings.length, 0);

  const md = [
    "# Screenshot evaluation: pasted text vs chat screenshot",
    "",
    `- Model: ${provider.model} (fallback may answer; see JSON) · ${rows.length} items (${scams.length} scam)`,
    "- Screenshots are renderings of the real messages in a generic chat layout, made for this test.",
    "",
    "| | Pasted | Screenshot |",
    "|---|---|---|",
    `| Scams flagged ("uses scam tactics") | ${scams.filter((r) => flagged(r.pasted)).length}/${scams.length} | ${scams.filter((r) => flagged(r.image)).length}/${scams.length} |`,
    `| Scams marked caution or worse | ${scams.filter((r) => caution(r.pasted)).length}/${scams.length} | ${scams.filter((r) => caution(r.image)).length}/${scams.length} |`,
    `| Tactics found (total) | ${pTactics} | ${iTactics} |`,
    `| Quotes dropped by the code check | ${rows.reduce((n, r) => n + r.pasted.droppedFindings.length, 0)} | ${iDropped} |`,
    `| "Can't check" answers | ${rows.filter((r) => !ok(r.pasted)).length} | ${rows.filter((r) => !ok(r.image)).length} |`,
    "",
    `- Same verdict pasted and as screenshot: ${agree} of ${rows.length}`,
    `- Median transcript accuracy (character similarity to the real text): ${(medianSim * 100).toFixed(1)}%`,
    "",
    "## Per item",
    "",
    "| Item | Pasted | Screenshot | Transcript |",
    "|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.shot.id}${r.shot.hard ? " (multi-bubble)" : ""} | ${r.pasted.verdict.verdict} (${r.pasted.findings.map((f) => f.tactic).join(", ")}) | ${r.image.verdict.verdict} (${r.image.findings.map((f) => f.tactic).join(", ")}) | ${(r.sim * 100).toFixed(0)}% |`,
    ),
  ].join("\n");

  mkdirSync("results", { recursive: true });
  const id = `screenshots-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  writeFileSync(`results/${id}.json`, JSON.stringify(rows, null, 2));
  writeFileSync(`results/${id}.md`, md);
  console.log(`\n${md}\n\nSaved results/${id}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
