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

The reference set (`data/messages.jsonl`) is real scam messages from public Malaysian advisories and news, plus genuine messages, each labelled by hand with the tactics it uses. Sources are in `data/SOURCES.md`. The prompt and weights are tuned on the `dev` split only. Results are written to `results/`.

## Third-party services

- Google Gemini API (message reading). On the free tier, Google may use inputs to improve its products, so remove names, IC and account numbers before checking.
- Groq API (comparison model, optional).
- Next.js, React, Tailwind CSS, Zod, Vitest.

## Limitations

To be completed from the measured results. Known so far:
- Tested only on Malay, English and Chinese text.
- For screenshots, quotes are checked against the model's own transcript, which is weaker than checking pasted text.
- A clean result is not proof of safety; new scams may use tactics outside the rubric.

## Licence

MIT
