# Development log

Records what was built when, and how AI-written code was checked (rubric checks A4a/A4b).

## Sat 21 Nov 2026

- Scaffolded Next.js 16 + TypeScript. Wrote the tactic rubric, identifier extraction, input prechecks, quote verification, rule-based verdict, Gemini and Groq providers, API route, first UI and the evaluation script. Code was drafted with an AI coding assistant (Claude).
- **AI-written code checked by tests:** `locateQuote` (`src/lib/verify.ts`) maps a quoted phrase back to its position in the original message. The unit test with an emoji before Chinese text failed: the highlight started one character late. Cause: the index map had one entry per character, but string search counts emoji as two UTF-16 units. **Decision: changed** to one map entry per UTF-16 unit, and added a guard against matches starting inside an emoji. 30 of 30 unit tests pass after the fix.
- Checked the UI in a headless browser on a 390 px phone viewport with the development mock: highlights, tactic cards, the bare-number "can't tell" path with the Semak Mule link, and the Malay toggle render with no console errors.

### To do by a person (A4a/A4b)

Shermaine to review one AI-written function by hand (suggested: `extractIdentifiers` in `src/lib/extract.ts`), try 10 real Malaysian phone numbers, account numbers and defanged links against it, record the results here, and decide keep / change / reject.
