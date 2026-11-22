# Semak Mesej

See the tactics in a suspicious WhatsApp, SMS or RCS message before you reply.

Paste a message (Malay, English, Chinese or a mix) or upload a screenshot. Semak Mesej highlights the exact words that use a known scam tactic (rushing you, asking for money or codes, pushing a link, threatening you, keeping you isolated) and shows what a genuine sender would do instead. Phone and account numbers it finds are passed to [Semak Mule](https://semakmule.rmp.gov.my/), the police database of reported numbers.

It never says a message is "safe".

> Status: in development for the Global AI Builder's Challenge (21 to 28 Nov 2026). Everything in this repository was built during the event.

## How it works

1. **Input checks (code).** Too short, a bare number, an untested script, or an over-long paste gets a "can't tell" answer and a next step. No AI call is made.
2. **One AI call (structured output, temperature 0).** The model reads the message against a fixed 8-tactic rubric (`src/lib/tactics.ts`) and returns, for each tactic, the exact phrase it relied on. It does **not** return a verdict.
3. **Quote check (code).** Every quoted phrase must actually appear in the message (`src/lib/verify.ts`). Phrases that don't are dropped and counted.
4. **Verdict (code).** A weighted rule table over the verified tactics (`src/lib/verdict.ts`) gives *Scam tactics found*, *Some warning signs*, *No known tactics found (not proof it's safe)*, or *Can't tell*.

Failures are handled without guessing: unreadable screenshots, model timeouts and invalid model output all produce "can't tell" and keep the user's input and previous result.

## Run it

```bash
npm install
cp .env.example .env.local   # add a Gemini API key from aistudio.google.com
npm run dev                  # http://localhost:3000
npm test                     # unit tests for the deterministic code
```

`MODEL_PROVIDER=mock` runs a keyword stand-in so the UI can be developed without a key. It is development-only, refused on Vercel production, and none of its output is reported as a result.

## Evaluation

```bash
npx tsx scripts/eval.ts --set dev  --provider gemini              # prompt development
npx tsx scripts/eval.ts --set test --provider gemini --repeats 3 --baseline
```

The reference set (`data/messages.jsonl`) holds real scam messages quoted from public Malaysian advisories and news, plus 50 written (synthetic) test cases kept in their own split. Each message is labelled with the tactics it uses (`data/LABELING.md`). Sources are in `data/SOURCES.md`. The prompt and weights are tuned on the `dev` split only. Results are written to `results/`.

## Third-party services

- Google Gemini API (message reading). On the free tier, Google may use inputs to improve its products, so remove names, IC and account numbers before checking.
- Groq API (comparison model, optional).
- Next.js, React, Tailwind CSS, Zod, Vitest.

## Results

Full tables are in `results/`, and the write-up in `docs/DEVPOST_DRAFT.md`. Each message was run 3 times; figures are first-run unless stated.

| | Real scams (18) | Written test cases (22 scam, 28 genuine) |
|---|---|---|
| Scams marked "be careful" or worse | 17 of 18 | 21 of 22 |
| Scams marked "uses scam tactics" | 11 of 18 | 18 of 22 |
| Genuine wrongly flagged | 0 of 1 | 2 of 28 |
| Same verdict on all 3 runs | 16 of 19 | 41 of 50 |

- **Quote check:** 3 of 437 AI-quoted phrases were not in the message, and code removed them.
- **Plain-prompt comparison:** on the written cases, the same model with a plain "is this a scam?" prompt flagged 22 of 22 scams but also 3 of 28 genuine messages, including two family money messages, and explains nothing.

## Limitations

- A scam whose text has only one tactic (often one bubble of a longer chat) gets "be careful", not "uses scam tactics".
- First messages that are only a lure ("your photo is in a group", "wrong number, can we be friends?") have no tactic in the text yet.
- 13 of 28 genuine written alerts got "be careful", 10 of them only because they name a sender the tool can't verify.
- Tested on Malay, English and Chinese, and on clean screenshots only.
- A clean result is not proof of safety; new scams may use tactics outside the rubric.

## Licence

MIT
