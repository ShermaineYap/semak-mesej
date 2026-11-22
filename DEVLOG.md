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

## Sat 21 Nov 2026, night: redesign and saved examples

- Redesigned the UI for the real audience (people checking messages forwarded in family chats): Atkinson Hyperlegible (designed for low-vision readers), the message shown as the chat bubble it arrived in, highlighter colours per tactic group, numbered notes in the order they appear, each paired with what a real sender does (D3, D4b).
- Added "Try an example" buttons that replay **saved real results** (`scripts/record-samples.ts`, stored with model and date in `src/data/samples.json`) so judges and visitors don't spend the free quota. The page labels them as saved results.
- Observed run-to-run variation at temperature 0: S027 got `threat` ("bahaya sngt") in the dev run and `urgency` (same phrase) when recording samples. To be measured properly with 3 repeats on the test set (R2c).
- Browser test caught a test-script bug, not an app bug: Playwright's text match is case-insensitive, so "Semak mesej" clicked the "Semak Mesej" logo. Tests now click the button by role.

## Sun 22 Nov 2026, early: deployed

- Live at https://semak-mesej.vercel.app (Vercel, Hobby). Only `GEMINI_API_KEY` is set there; model names use the code defaults.
- The first live check returned "model unavailable" and was handled safely (error shown, input kept). The cause wasn't recorded because provider errors weren't logged; added a server log line (message only, no key). After redeploying, live checks worked: pasted S004 gave `scam_signs` in 3.0 s on gemini-3.5-flash-lite.
- **Screenshot input, live** (`docs/evidence/chat_S004.png`, a phone-chat rendering of the real message S004 made for this test): transcript correct, 3 tactics found, 0 quotes dropped, verdict `some_signs`. The same text pasted gave 4 tactics and `scam_signs`; the screenshot run missed `payment_request`. **To measure:** screenshot versions of the test set.
- **Unreadable screenshot, live** (`docs/evidence/chat_S004_blurred.png`, the same image pixelated and blurred): `cant_tell / unreadable_image`, no findings shown (R3a).
- **Bare number, live:** `cant_tell / identifier_only`, no AI call, Semak Mule link shown (R3b).

## Sun 22 Nov 2026: measured evaluation, video

- Imported 50 written (synthetic) test cases into their own `synth` split; tactic labels drafted by Claude under rules R1-R10 (`data/LABELING.md`), for Shermaine to review. Never used for tuning.
- Test-set runs, 3 repeats each, plus a plain "is this a scam?" baseline: `results/test-*`, `results/synth-*`, `results/screenshots-*`. 247 runs; 4 AI calls failed (timeouts) and were answered "can't check".
- **No rule or prompt changes were made after seeing the test results.** The clearest improvement (weight of `impersonation` alone, which caused 10 of 13 "be careful" results on genuine messages) is recorded as a next step, not applied.
- **Rejected an earlier conclusion (A4b):** "screenshots are weaker than pasted text" came from one live check (S004). The 20-item screenshot evaluation didn't support it (same 12 of 19 scams flagged both ways; 18 vs 16 marked "be careful" or worse). Removed from the limits.
- **Corrected a claim before publishing:** the first write-up draft said 6 of 7 "be careful" real scams were single chat bubbles. Checking the messages showed 3 were; the accurate version ("only one tactic in the text") is in the write-up.
- Video (`docs/video/semak-mesej-demo.mp4`, 3:21): phone segments recorded on the live site by `scripts/video/record.py`, Piper TTS narration, assembled by `scripts/video/compose.py`. Every result shown is a live result.
