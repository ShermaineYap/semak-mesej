"use client";

import { useMemo, useState } from "react";
import type { AnalysisResult, VerifiedFinding } from "@/lib/analyze";
import { TACTICS, type TacticGroup } from "@/lib/tactics";
import { CANT_TELL_COPY, SEMAK_MULE_URL, UI, VERDICT_COPY, type Lang } from "@/lib/copy";
import type { CantTellReason } from "@/lib/precheck";

const GROUP_STYLE: Record<TacticGroup, { mark: string; chip: string }> = {
  pressure: { mark: "bg-amber-200/80 decoration-amber-600", chip: "bg-amber-100 text-amber-900 border-amber-300" },
  identity: { mark: "bg-sky-200/80 decoration-sky-600", chip: "bg-sky-100 text-sky-900 border-sky-300" },
  money: { mark: "bg-rose-200/80 decoration-rose-600", chip: "bg-rose-100 text-rose-900 border-rose-300" },
  access: { mark: "bg-violet-200/80 decoration-violet-600", chip: "bg-violet-100 text-violet-900 border-violet-300" },
  lure: { mark: "bg-emerald-200/80 decoration-emerald-600", chip: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};

const VERDICT_STYLE = {
  scam_signs: "bg-rose-600 text-white",
  some_signs: "bg-amber-400 text-stone-950",
  no_known_signs: "bg-stone-700 text-white",
  cant_tell: "bg-stone-200 text-stone-900",
} as const;

type Segment = { text: string; findings: VerifiedFinding[] };

function segments(text: string, findings: VerifiedFinding[]): Segment[] {
  const cuts = new Set([0, text.length]);
  for (const f of findings) {
    cuts.add(f.span.start);
    cuts.add(f.span.end);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [a, b] = [sorted[i], sorted[i + 1]];
    out.push({
      text: text.slice(a, b),
      findings: findings.filter((f) => f.span.start <= a && f.span.end >= b),
    });
  }
  return out;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "text"
          ? { text }
          : file
            ? { image: { mimeType: file.type, base64: await fileToBase64(file) } }
            : null;
      if (!body) return;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        return; // keep the previous result on screen
      }
      const r = data as AnalysisResult;
      // A transient failure keeps the last good result; input checks replace it
      if (r.verdict.reason === "model_unavailable" || r.verdict.reason === "invalid_model_output") {
        setError(CANT_TELL_COPY[r.verdict.reason][lang]);
        return;
      }
      setResult(r);
      setActive(null);
    } catch {
      setError(CANT_TELL_COPY.model_unavailable[lang]);
    } finally {
      setBusy(false);
    }
  }

  const segs = useMemo(() => (result ? segments(result.text, result.findings) : []), [result]);
  const canCheck = !busy && (mode === "text" ? text.trim().length > 0 : !!file);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-stone-900">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Semak Mesej</h1>
          <p className="mt-1 text-stone-600">{UI.tagline[lang]}</p>
        </div>
        <div className="flex rounded-full border border-stone-300 p-0.5 text-sm" role="group" aria-label="Language">
          {(["en", "ms"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 ${lang === l ? "bg-stone-900 text-white" : ""}`}
              aria-pressed={lang === l}
            >
              {l === "en" ? "EN" : "BM"}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex gap-2 text-sm" role="tablist">
          {(["text", "image"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 ${mode === m ? "bg-stone-900 text-white" : "bg-stone-100"}`}
            >
              {m === "text" ? UI.pasteTab[lang] : UI.imageTab[lang]}
            </button>
          ))}
        </div>
        {mode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={UI.placeholder[lang]}
            rows={6}
            className="w-full resize-y rounded-xl border border-stone-300 p-3 font-mono text-sm focus:outline-2 focus:outline-stone-900"
          />
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-8 text-sm text-stone-600">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? file.name : UI.chooseImage[lang]}
          </label>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs text-stone-500">{UI.privacy[lang]}</p>
          <button
            onClick={check}
            disabled={!canCheck}
            className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white disabled:opacity-40"
          >
            {busy ? UI.checking[lang] : UI.check[lang]}
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-stone-300 bg-stone-100 p-3 text-sm">
          {error} {result && UI.previousKept[lang]}
        </div>
      )}

      {result && (
        <section className="mt-6 space-y-4" aria-live="polite">
          <div className={`rounded-2xl p-5 ${VERDICT_STYLE[result.verdict.verdict]}`}>
            <h2 className="text-2xl font-bold">{VERDICT_COPY[result.verdict.verdict].title[lang]}</h2>
            <p className="mt-1 max-w-3xl">
              {result.verdict.verdict === "cant_tell"
                ? CANT_TELL_COPY[result.verdict.reason as CantTellReason][lang]
                : VERDICT_COPY[result.verdict.verdict].body[lang]}
            </p>
          </div>

          {result.text && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="whitespace-pre-wrap break-words font-mono text-sm leading-7">
                {segs.map((s, i) =>
                  s.findings.length === 0 ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <mark
                      key={i}
                      onClick={() => setActive(s.findings[0].tactic)}
                      className={`cursor-pointer rounded px-0.5 underline decoration-2 underline-offset-4 ${GROUP_STYLE[TACTICS[s.findings[0].tactic].group].mark} ${active && s.findings.some((f) => f.tactic === active) ? "ring-2 ring-stone-900" : ""}`}
                      title={s.findings.map((f) => TACTICS[f.tactic].label[lang]).join(", ")}
                    >
                      {s.text}
                    </mark>
                  ),
                )}
              </p>
              {result.droppedFindings.length > 0 && (
                <p className="mt-3 text-xs text-stone-500">
                  {result.droppedFindings.length} {UI.dropped[lang]}
                </p>
              )}
            </div>
          )}

          {result.findings.length > 0 && (
            <div className="grid gap-3">
              <div className="hidden grid-cols-[1fr_1fr] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500 md:grid">
                <span>{UI.thisMessage[lang]}</span>
                <span>{UI.genuine[lang]}</span>
              </div>
              {result.findings.map((f) => {
                const t = TACTICS[f.tactic];
                return (
                  <article
                    key={f.tactic}
                    onClick={() => setActive(f.tactic)}
                    className={`grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr] ${active === f.tactic ? "border-stone-900" : "border-stone-200"}`}
                  >
                    <div>
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${GROUP_STYLE[t.group].chip}`}>
                        {t.label[lang]}
                      </span>
                      <blockquote className="mt-2 border-l-4 border-stone-300 pl-3 font-mono text-sm">“{f.quote}”</blockquote>
                      <p className="mt-2 text-sm">{f.explanation[lang]}</p>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 md:hidden">
                        {UI.genuine[lang]}
                      </span>
                      {t.genuineContrast[lang]}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {(result.identifiers.phones.length + result.identifiers.accounts.length + result.identifiers.links.length > 0) && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
              <h3 className="font-semibold">{UI.numbersFound[lang]}</h3>
              <ul className="mt-2 space-y-1">
                {[...result.identifiers.phones, ...result.identifiers.accounts].map((n) => (
                  <li key={n} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-stone-100 px-1.5">{n}</code>
                    <a href={SEMAK_MULE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      {UI.checkOnSemakMule[lang]}
                    </a>
                  </li>
                ))}
                {result.identifiers.links.map((l) => (
                  <li key={l} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-stone-100 px-1.5">{l.replace(/\./g, "[.]")}</code>
                    <span className="text-stone-600">{UI.dontTap[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-stone-600">{UI.report[lang]}</p>
          {result.meta.model && (
            <p className="text-xs text-stone-400">
              {result.meta.model} · {result.meta.promptVersion} · {result.meta.latencyMs} ms
            </p>
          )}
        </section>
      )}
    </main>
  );
}
