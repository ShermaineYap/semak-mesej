# Development log

Records what was built when, and how AI-written code was checked (rubric checks A4a/A4b).

## Sat 21 Nov 2026

- Scaffolded Next.js 16 + TypeScript. Wrote the tactic rubric, identifier extraction, input prechecks, quote verification, rule-based verdict, Gemini and Groq providers, API route, first UI and the evaluation script. Code was drafted with an AI coding assistant (Claude).
- **AI-written code checked by tests:** `locateQuote` (`src/lib/verify.ts`) maps a quoted phrase back to its position in the original message. The unit test with an emoji before Chinese text failed: the highlight started one character late. Cause: the index map had one entry per character, but string search counts emoji as two UTF-16 units. **Decision: changed** to one map entry per UTF-16 unit, and added a guard against matches starting inside an emoji. 30 of 30 unit tests pass after the fix.
- Checked the UI in a headless browser on a 390 px phone viewport with the development mock: highlights, tactic cards, the bare-number "can't tell" path with the Semak Mule link, and the Malay toggle render with no console errors.

### To do by a person (A4a/A4b)

Shermaine to review one AI-written function by hand (suggested: `extractIdentifiers` in `src/lib/extract.ts`), try 10 real Malaysian phone numbers, account numbers and defanged links against it, record the results here, and decide keep / change / reject.

## Sat 21 Nov 2026, evening: model choice on the dev set (A1a/A1b)

Seven development messages, one run each, fallback off so each row is one model. Free tier, thinking level "low".

| Model | Answered | Scams marked caution or worse | Quotes not found in message | Median latency |
|---|---|---|---|---|
| gemini-2.5-flash | 0 of 7 | n/a | n/a | n/a (404: closed to new users) |
| gemini-3.8-flash | 0 of 7 | n/a | n/a | n/a (503 high demand) |
| gemini-3.5-flash | 2 of 7 | 2 of 7 | 0 | 42 s (mostly 503 high demand) |
| gemini-3.5-flash-lite | 7 of 7 | 7 of 7 | 0 of 20 | 1.1 s |

**Decision:** gemini-3.5-flash-lite as the main model, gemini-3.5-flash as the fallback. The reason today is reliability and speed on the free tier, not accuracy: genuine messages are not in the set yet, so false alarms are unmeasured. Re-check 3.5-flash and 3.8-flash when they are not overloaded.

**Reliability change prompted by this:** the provider now retries a 503/429 once after 2 s, then switches to the fallback model, and records which model answered (unit-tested in `providers.test.ts`).

Notable outputs: S027 (a "your photo is in a viral group" lure, labelled with no tactics) was marked "some signs" because the model quoted "bahaya sngt" ("very dangerous") as a threat. Under the rubric that is fear, not a threatened penalty, so the label stays empty and this counts as a tactic false positive.
