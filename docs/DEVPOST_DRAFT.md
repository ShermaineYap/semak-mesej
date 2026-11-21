# Semak Mesej: Devpost write-up (DRAFT)

> Draft from 22 Nov. Every `[TO FILL]` waits on the test-set run, which needs the genuine messages. Don't submit with any `[TO FILL]` left. Check IDs in brackets map to the published rubric.

**Tagline:** See the scam tactics in a suspicious WhatsApp or SMS, marked on the exact words, before you reply.

**Live:** https://semak-mesej.vercel.app · **Code:** https://github.com/ShermaineYap/semak-mesej

---

## 1. Who it's for and what they need

Malaysians who get a doubtful message on WhatsApp, SMS or RCS, often in a mix of Malay, English and Chinese, and want to know whether to trust it before they reply, pay or forward it to the family group.

- Malaysians lost **RM6.95 billion** to online scams across **181,750 cases** from 2023 to August 2026 (Home Ministry, via Malay Mail, 17 Nov 2026). [V1a]
- In a 2025 survey of 1,000 Malaysians, **73% had been deceived** although 75% were confident they could spot a scam, and **56% of attempts came through messaging apps** (GASA, via The Star). [V1a]
- After SMS links were blocked, scammers moved to RCS, iMessage and WhatsApp (MCMC, via The Star, Aug 2026). [V1a]

**Example** [V1b]: a message claiming to be from "Postal Malaysia" says your parcel can't be delivered, that "the cost of redelivery will be borne by you", and gives you "12 hours". Semak Mesej marks each of those phrases and explains, beside each one, what a real courier would do instead.

## 2. How it compares with what people use today [V2a, V2b]

| | Semak Mule (police) | AIFA (MCMC chatbot) | Semak Mesej |
|---|---|---|---|
| What it checks | A bank account, phone number or company name already reported | A message against fact-checked items from official sources | The wording of the message itself |
| Brand-new scam nobody has reported | Not found | `[TO FILL from AIFA test]` | Tactics still marked |
| Explains *why* | No | `[TO FILL]` | Yes, phrase by phrase |
| Never says "safe" | A clean result isn't proof (police guidance) | `[TO FILL]` | Yes, by design |

Semak Mesej doesn't replace Semak Mule: any phone or account number it finds comes with a "Look it up on Semak Mule" link.

On the test set, `[TO FILL: e.g. Semak Mesej explained N of M scams with at least one marked tactic; a plain "is this a scam?" prompt gave a yes/no with no explanation and wrongly flagged K of G genuine messages]`. [V2b]

## 3. What was built during the event

Everything. The project was started on 21 Nov 2026 and the repo history shows every step. Built:
- the tactic rubric
- the pipeline: input checks, one AI call, a code-side quote check, and a rule-based verdict
- the web app (English/Bahasa, paste or screenshot)
- the labelled test set and evaluation script
- unit tests, deployment, and the saved real examples

`DEVLOG.md` records what was done and when.

## 4. How AI is used

### In the product [A1a, A2a]

One call to **Gemini 3.5 Flash-Lite**, using structured output with temperature 0. It reads the message, or the text in a screenshot, against a fixed rubric of 8 tactics. For each tactic it finds, it returns the exact phrase it relied on.

The design choice: **the AI points, code decides.**
1. **Input checks in code** run before any AI call: too short, just a number, an untested script, or too long.
2. **Every phrase the AI quotes must really appear in the message** (`src/lib/verify.ts`). Phrases that don't are dropped and the count is shown.
3. **A weighted rule table decides the verdict** (`src/lib/verdict.ts`): *uses scam tactics*, *be careful*, *no known tactics (not proof it's safe)*, or *can't check*. It never outputs "safe".

Why Gemini Flash-Lite [A1a, A1b]: it reads mixed Malay, English and Chinese, and reads screenshots directly. It returns structured JSON, has a free tier, and was the only model that answered reliably in testing.

| Model (7 development messages, 21 Nov) | Answered | Quotes not found in message | Median time |
|---|---|---|---|
| Gemini 2.5 Flash | 0 of 7 (closed to new users) | n/a | n/a |
| Gemini 3.8 Flash | 0 of 7 (overloaded) | n/a | n/a |
| Gemini 3.5 Flash | 2 of 7 (mostly overloaded) | 0 | 42 s |
| **Gemini 3.5 Flash-Lite** | **7 of 7** | **0 of 20** | **1.1 s** |

This is also why the app retries once when Gemini is overloaded, then falls back to 3.5 Flash, and shows which model answered.

### Evidence the design helps [A2b]

`[TO FILL from test run: rubric pipeline vs plain yes/no prompt, on the same messages. Report scams flagged, genuine wrongly flagged, and the share of AI quotes the code check dropped.]`

### Checked against a clear reference [A3a]

The test set is **`[TO FILL]` real messages**:
- `[n]` scams quoted word for word from Malaysian police, bank and news sources, each with its source URL in `data/SOURCES.md`
- `[n]` genuine messages

Each message was hand-labelled with the tactics it uses, following written rules (`data/LABELING.md`). The prompt and model were chosen on a separate development split; the test split was run once, 3 times per message.

`[TO FILL results table: scams flagged; scams marked "be careful" or worse; genuine wrongly flagged; per-tactic precision/recall; same verdict on all 3 repeats; median time]`

### When to rely on it, and when not to [A3b]

- **First messages that are only a lure** ("your photo is in a viral group") carry no tactic in the text, because the link comes later. They can come back as *be careful* or *no known tactics*. These stay in the test set on purpose.
- **Screenshots are weaker than pasted text.** In a live check, the same parcel message pasted gave 4 tactics, but as a screenshot gave 3 (it missed the fee). For screenshots, quotes are checked against the AI's own reading of the image.
- **Run-to-run variation exists even at temperature 0.** One lure message was labelled *threat* on one run and *urgency* on another. `[TO FILL repeat-agreement figure]`
- Tested only on **Malay, English and Chinese**; other scripts are refused rather than guessed.
- **A clean result is never proof of safety**, and the app says so every time.

### AI during development [A4a, A4b]

The code was drafted with an AI coding assistant (Claude); every AI-written function has unit tests (35 tests).
- **Example:** the AI-written function that maps a quoted phrase back to its position in the message failed a test with an emoji before Chinese text. The highlight started one character late, because emoji count as two units in JavaScript strings. **Changed** to map per unit and added a guard (DEVLOG, 21 Nov).
- `[TO FILL: Shermaine's own review of extractIdentifiers: what she tried, what she found, keep/change/reject.]`

## 5. Access, results, and how it fails

- **Access** [V3]:
  - Mobile-first web page, no account needed, in English or Bahasa.
  - Paste text or upload a screenshot.
  - Three examples replay **saved real results** (labelled with model and date) so visitors don't use the free quota.
  - Limited to 20 checks per device per hour.
- **Works start to finish** [R1, R2a-d]: `[TO FILL: list the video's examples: English parcel (R2a), Malay loan from a 'celebrity' (R2b), the same message again (R2c), long mixed-language screenshot (R2d)]`
- **Fails safely** [R3a, R3b]:
  - **Blurred screenshot:** "couldn't read it, try a sharper one", with no findings shown.
  - **Just a phone or account number:** no AI call; sends you to Semak Mule.
  - **AI overloaded or broken output:** retry, then fall back to another model, then "try again". Your message and last result stay on screen.
- **Limits:** see above. Gemini's free tier may use inputs to improve Google's products, so the page asks people to remove names, IC and account numbers first.

## Built with

Next.js, TypeScript, Tailwind CSS, Zod, Vitest, Playwright, Gemini API (3.5 Flash-Lite / 3.5 Flash), Vercel.
