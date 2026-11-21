"use client";

import { useMemo, useRef, useState } from "react";
import type { AnalysisResult, VerifiedFinding } from "@/lib/analyze";
import { TACTICS } from "@/lib/tactics";
import { CANT_TELL_COPY, SEMAK_MULE_URL, UI, VERDICT_COPY, type Lang } from "@/lib/copy";
import type { CantTellReason } from "@/lib/precheck";
import samplesJson from "@/data/samples.json";

interface Sample {
  id: string;
  label: Record<Lang, string>;
  source: { name: string; url: string };
  recordedAt: string;
  result: AnalysisResult;
}
const SAMPLES = samplesJson as unknown as Sample[];

type Segment = { text: string; finding: VerifiedFinding | null; number: number };

/** Split the message into plain and highlighted runs. Overlaps go to the earlier finding. */
function segments(text: string, findings: VerifiedFinding[]): Segment[] {
  const sorted = [...findings].sort((a, b) => a.span.start - b.span.start);
  const out: Segment[] = [];
  let pos = 0;
  sorted.forEach((f, i) => {
    const start = Math.max(f.span.start, pos);
    if (start >= f.span.end) return;
    if (start > pos) out.push({ text: text.slice(pos, start), finding: null, number: 0 });
    out.push({ text: text.slice(start, f.span.end), finding: f, number: i + 1 });
    pos = f.span.end;
  });
  if (pos < text.length) out.push({ text: text.slice(pos), finding: null, number: 0 });
  return out;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function formatDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === "ms" ? "ms-MY" : "en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const VERDICT_TONE = {
  scam_signs: "bg-alarm text-white",
  some_signs: "bg-caution text-ink",
  no_known_signs: "bg-white text-ink ring-2 ring-ink",
  cant_tell: "bg-wall text-ink",
} as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  function show(r: AnalysisResult, s: Sample | null) {
    setResult(r);
    setSample(s);
    setActive(null);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

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
        setError(data.message ?? CANT_TELL_COPY.model_unavailable[lang]);
        return; // the last result stays on screen
      }
      const r = data as AnalysisResult;
      if (r.verdict.reason === "model_unavailable" || r.verdict.reason === "invalid_model_output") {
        setError(CANT_TELL_COPY[r.verdict.reason][lang]);
        return;
      }
      show(r, null);
    } catch {
      setError(CANT_TELL_COPY.model_unavailable[lang]);
    } finally {
      setBusy(false);
    }
  }

  function trySample(s: Sample) {
    setMode("text");
    setText(s.result.text);
    setError(null);
    show(s.result, s);
  }

  const segs = useMemo(() => (result ? segments(result.text, result.findings) : []), [result]);
  const ordered = useMemo(
    () => (result ? [...result.findings].sort((a, b) => a.span.start - b.span.start) : []),
    [result],
  );
  const canCheck = !busy && (mode === "text" ? text.trim().length > 0 : !!file);
  const numbers = result ? [...result.identifiers.phones, ...result.identifiers.accounts] : [];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-lg font-bold tracking-tight">Semak Mesej</p>
        <div className="flex rounded-full bg-white p-1 text-sm ring-1 ring-line" role="group" aria-label="Language / Bahasa">
          {(["en", "ms"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`rounded-full px-3 py-1 font-bold ${lang === l ? "bg-ink text-white" : "text-ink-soft"}`}
            >
              {l === "en" ? "English" : "Bahasa"}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="max-w-xl">
          <h1 className="text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-5xl">{UI.headline[lang]}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{UI.intro[lang]}</p>
        </div>

        <div className="rounded-3xl bg-white p-4 ring-1 ring-line sm:p-5">
          <div className="flex gap-1 rounded-xl bg-page p-1 text-sm" role="tablist">
            {(["text", "image"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-3 py-2 font-bold ${mode === m ? "bg-white shadow-sm" : "text-ink-soft"}`}
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
              aria-label={UI.placeholder[lang]}
              rows={5}
              className="mt-3 w-full resize-y rounded-xl border border-line p-3 font-[family-name:var(--font-phone)] text-base leading-relaxed focus:border-ink focus:outline-none"
            />
          ) : (
            <label className="mt-3 flex min-h-36 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line p-6 text-center text-ink-soft focus-within:border-ink">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? <span className="font-bold text-ink">{file.name}</span> : UI.chooseImage[lang]}
            </label>
          )}

          <button
            onClick={check}
            disabled={!canCheck}
            className="mt-3 w-full rounded-xl bg-ink px-5 py-3.5 text-lg font-bold text-white transition-opacity disabled:opacity-35"
          >
            {busy ? `${UI.checking[lang]}…` : UI.check[lang]}
          </button>
          <p className="mt-3 text-sm leading-snug text-ink-soft">{UI.privacy[lang]}</p>

          {SAMPLES.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm text-ink-soft">{UI.tryExample[lang]}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => trySample(s)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${sample?.id === s.id ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-ink"}`}
                  >
                    {s.label[lang]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-white p-4 ring-2 ring-alarm">
          {error} {result && UI.previousKept[lang]}
        </p>
      )}

      {result && (
        <section ref={resultRef} tabIndex={-1} aria-live="polite" className="reveal mt-10 focus:outline-none">
          <div className={`rounded-3xl p-6 sm:p-8 ${VERDICT_TONE[result.verdict.verdict]}`}>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              {VERDICT_COPY[result.verdict.verdict].title[lang]}
            </h2>
            <p className="mt-2 max-w-[62ch] text-lg leading-relaxed">
              {result.verdict.verdict === "cant_tell"
                ? CANT_TELL_COPY[result.verdict.reason as CantTellReason][lang]
                : VERDICT_COPY[result.verdict.verdict].body[lang]}
            </p>
            {result.verdict.reason === "identifier_only" && (
              <a
                href={SEMAK_MULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-xl bg-ink px-4 py-2.5 font-bold text-white"
              >
                {UI.checkOnSemakMule[lang]}
              </a>
            )}
          </div>

          {result.text && result.verdict.reason !== "identifier_only" && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
              {/* The message, as it arrived, marked up */}
              <div className="rounded-3xl bg-wall p-5 sm:p-7 lg:sticky lg:top-6">
                {result.source === "image" && (
                  <p className="mb-3 text-sm text-ink-soft">{UI.fromScreenshot[lang]}</p>
                )}
                <div className="bubble ml-2 bg-white p-4 shadow-sm">
                  <p className="whitespace-pre-wrap break-words font-[family-name:var(--font-phone)] text-[1.05rem] leading-[1.9]">
                    {segs.map((s, i) =>
                      s.finding ? (
                        <mark
                          key={i}
                          className="pen text-ink"
                          data-group={TACTICS[s.finding.tactic].group}
                          data-active={active === s.finding.tactic}
                          onClick={() => setActive(s.finding!.tactic)}
                        >
                          {s.text}
                          <sup className="ml-0.5 font-sans text-[0.68rem] font-bold">{s.number}</sup>
                        </mark>
                      ) : (
                        <span key={i}>{s.text}</span>
                      ),
                    )}
                  </p>
                </div>
                {result.droppedFindings.length > 0 && (
                  <p className="mt-3 text-sm text-ink-soft">
                    {result.droppedFindings.length} {UI.dropped[lang]}
                  </p>
                )}
              </div>

              {/* Margin notes, numbered in the order they appear in the message */}
              <div>
                {ordered.length === 0 ? (
                  <p className="rounded-2xl bg-white p-5 text-lg ring-1 ring-line">{UI.noTactics[lang]}</p>
                ) : (
                  <ol className="space-y-3">
                    {ordered.map((f, i) => {
                      const t = TACTICS[f.tactic];
                      const isActive = active === f.tactic;
                      return (
                        <li key={f.tactic}>
                          <button
                            onClick={() => setActive(f.tactic)}
                            aria-pressed={isActive}
                            className={`block w-full rounded-2xl bg-white p-5 text-left ring-1 transition-shadow ${isActive ? "ring-2 ring-ink" : "ring-line"}`}
                          >
                            <span className="flex items-baseline gap-3">
                              <span
                                className="swatch inline-grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold"
                                data-group={t.group}
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <span>
                                <span className="block text-xl font-bold leading-snug">{t.label[lang]}</span>
                                <span className="mt-1 block text-base leading-relaxed">{f.explanation[lang]}</span>
                              </span>
                            </span>
                            <span className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                              <span className="text-sm font-bold text-ink-soft">{UI.realSender[lang]}</span>
                              <span className="text-[0.95rem] leading-snug text-ink-soft">{t.genuineContrast[lang]}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {(numbers.length > 0 || result.identifiers.links.length > 0) && (
                  <div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-line">
                    <h3 className="text-lg font-bold">{UI.numbersFound[lang]}</h3>
                    <ul className="mt-3 space-y-3">
                      {numbers.map((n) => (
                        <li key={n} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-[family-name:var(--font-phone)] font-bold">{n}</span>
                          <a href={SEMAK_MULE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                            {UI.checkOnSemakMule[lang]}
                          </a>
                        </li>
                      ))}
                      {result.identifiers.links.map((l) => (
                        <li key={l}>
                          <span className="break-all font-[family-name:var(--font-phone)] font-bold">{l.replace(/(?<!\[)\.(?!\])/g, "[.]")}</span>
                          <span className="mt-0.5 block text-ink-soft">{UI.dontTap[lang]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-2 text-ink-soft sm:grid-cols-2 sm:gap-6">
            <p className="text-lg font-bold text-ink">{UI.report[lang]}</p>
            <p className="text-sm leading-relaxed sm:text-right">
              {sample ? (
                <>
                  {UI.savedResult[lang]} {formatDate(sample.recordedAt, lang)}, {sample.result.meta.model}.{" "}
                  {UI.sourceLabel[lang]}:{" "}
                  <a href={sample.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    {sample.source.name}
                  </a>
                </>
              ) : (
                result.meta.model && (
                  <>
                    {UI.checkedWith[lang]} {result.meta.model}, {((result.meta.latencyMs ?? 0) / 1000).toFixed(1)} s
                  </>
                )
              )}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
