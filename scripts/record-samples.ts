// Records REAL results for the "Try an example" buttons, so visitors and judges
// can see the product without spending the free API quota.
//   npx tsx scripts/record-samples.ts
// Output: src/data/samples.json (each entry says which model produced it, and when).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze } from "../src/lib/analyze";
import { providerFromEnv } from "../src/lib/providers";

const SAMPLES = [
  { id: "S004", label: { en: "Parcel fee (English)", ms: "Yuran bungkusan (Inggeris)" } },
  { id: "S012", label: { en: "Loan from a 'celebrity' (Malay)", ms: "Pinjaman 'selebriti' (Melayu)" } },
  { id: "S027", label: { en: "'Your photo is in a group' (Malay)", ms: "'Gambar awak dalam grup' (Melayu)" } },
];

async function main() {
  const provider = providerFromEnv();
  if (!provider) throw new Error("Set GEMINI_API_KEY in .env.local");
  const all = new Map(
    readFileSync("data/messages.jsonl", "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .map((r) => [r.id, r]),
  );
  const out = [];
  for (const s of SAMPLES) {
    const item = all.get(s.id);
    if (!item) throw new Error(`Missing ${s.id}`);
    const result = await analyze({ text: item.text }, provider);
    if (result.verdict.verdict === "cant_tell" && result.verdict.reason?.startsWith("model") ) {
      throw new Error(`${s.id}: model failed (${result.verdict.reason}); try again later`);
    }
    out.push({
      id: s.id,
      label: s.label,
      source: { name: item.source_name, url: item.source_url },
      recordedAt: new Date().toISOString(),
      result,
    });
    console.log(s.id, result.verdict.verdict, result.findings.map((f) => f.tactic).join(","), result.meta.model);
  }
  mkdirSync("src/data", { recursive: true });
  writeFileSync("src/data/samples.json", JSON.stringify(out, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
