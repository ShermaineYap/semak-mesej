# Semak Mesej: Devpost write-up

> Ready to paste, except the three `[TO FILL]` items, which only Shermaine can supply: the AIFA test, who wrote the written test cases, and her own code review. Check IDs in brackets map to the published rubric.

**Tagline:** See the scam tactics in a suspicious WhatsApp or SMS, marked on the exact words, before you reply.

**Live:** https://semak-mesej.vercel.app · **Code:** https://github.com/ShermaineYap/semak-mesej · **Results:** `results/` in the repo

---

## 1. Who it's for and what they need

It's for Malaysians who get a doubtful message on WhatsApp, SMS or RCS and want to know whether to trust it before they reply, pay or forward it to the family group. These messages are often written in a mix of Malay, English and Chinese.

- Malaysians lost **RM6.95 billion** to online scams across **181,750 cases** from 2023 to August 2026 (Home Ministry, via Malay Mail, 17 Nov 2026). [V1a]
- In a 2025 survey of 1,000 Malaysians, **73% had been deceived** although 75% were confident they could spot a scam. **56% of attempts came through messaging apps** (GASA, via The Star). [V1a]
- After SMS links were blocked, scammers moved to RCS, iMessage and WhatsApp (MCMC, via The Star, Aug 2026). [V1a]

**Example** [V1b]: a message claiming to be from "Postal Malaysia" says your parcel can't be delivered, that "the cost of redelivery will be borne by you", and that you must act "within 12 hours". Semak Mesej highlights each of those phrases. Next to each one, it explains what a real courier would do instead.

## 2. How it compares with what people use today [V2a, V2b]

| | Semak Mule (police) | AIFA (MCMC chatbot) | Plain "is this a scam?" prompt | Semak Mesej |
|---|---|---|---|---|
| What it checks | A bank account, phone number or company name already reported | A message, against fact-checked items from official sources | The whole message, yes/no | The wording of the message, tactic by tactic |
| A brand-new scam nobody has reported | Nothing to look up | `[TO FILL from AIFA test]` | Answers | Tactics still marked |
| Explains *why* | No | `[TO FILL]` | No | Yes, on the exact words |
| Ever says "safe" | A clean result isn't proof (police guidance) | `[TO FILL]` | Says "not a scam" | Never, by design |

Semak Mesej works alongside Semak Mule: any phone or account number it finds comes with a "Look it up on Semak Mule" link.

**Measured benefit over the plain prompt** [V2b]: the plain prompt was the same model given the same messages and asked only "Is this a scam?".
- **Scams caught:** on 22 written scam cases it flagged all 22. Semak Mesej flagged 18 as "uses scam tactics" and 21 as "be careful" or worse.
- **Genuine messages wrongly flagged:** the plain prompt flagged 3 of 28, including **two ordinary family messages** ("Mama: Girl can you transfer RM200 to me?" and "爸：我刚转了RM300给你"). Semak Mesej flagged 2 of 28, a TNB bill and a Ninja Van notice, and **no family messages**.
- **What the user gets:** the plain prompt gives a bare yes/no. Semak Mesej shows the words to look at and what a real sender would do, so the person can judge it themselves.

## 3. What was built during the event

Everything. The project was started on 21 Nov 2026, and the commit history shows every step.

- the tactic rubric
- the pipeline: input checks, one AI call, a code-side quote check and a rule-based verdict
- the web app (English/Bahasa, paste or screenshot)
- the labelled test sets, labelling rules and evaluation scripts
- 35 unit tests
- deployment
- saved real examples
- this video

`DEVLOG.md` records what was done and when.

## 4. How AI is used

### In the product [A1a, A2a]

One call to **Gemini 3.5 Flash-Lite** (structured output, temperature 0) reads the message, or the text in a screenshot, against a fixed rubric of 8 tactics. For each tactic it finds, it returns the exact phrase it relied on.

The design choice is **the AI points, code decides**:

1. **Input checks in code** run before any AI call: text too short, just a number, an untested script, or too long.
2. **Every phrase the AI quotes must really appear in the message** (`src/lib/verify.ts`). Any that don't are dropped, and the page says how many.
3. **A weighted rule table decides the verdict** (`src/lib/verdict.ts`): *uses scam tactics*, *be careful*, *no known tactics (not proof it's safe)*, or *can't check*. It never outputs "safe".

**Why Gemini 3.5 Flash-Lite** [A1a, A1b]: it reads mixed Malay, English and Chinese text and phone screenshots, returns structured JSON and has a free tier. On the 7 development messages it was the only model that answered reliably:

| Model (7 development messages, 21 Nov) | Answered | Quotes not found in the message | Median time |
|---|---|---|---|
| Gemini 2.5 Flash | 0 of 7 (closed to new users) | n/a | n/a |
| Gemini 3.8 Flash | 0 of 7 (overloaded) | n/a | n/a |
| Gemini 3.5 Flash | 2 of 7 (mostly overloaded) | 0 | 42 s |
| **Gemini 3.5 Flash-Lite** | **7 of 7** | **0 of 20** | **1.1 s** |

Because of these results, the app retries once when Gemini is overloaded, then falls back to 3.5 Flash. Across 247 measured runs, 4 calls still failed. Each was answered with "can't check" and the user's message was kept.

### Evidence the design helps [A2b]

- **The quote check keeps explanations grounded.** Across 437 phrases the AI quoted in the measured runs, **3 were not in the message** (0.7%). Code removed them before anything was shown.
- **Code deciding the verdict reduced false alarms on the messages that matter most.** On the same 28 genuine written cases, the plain prompt flagged two family money messages. Semak Mesej flagged none of the family messages and 2 of 28 overall.
- **The rubric rule "a warning is not a request"** held on all 3 runs of a written bank TAC message containing "Never share this TAC with anyone". It was not flagged.
- **The cost:** fewer scams reach the strongest verdict (18 of 22 vs 22 of 22), because the rule table needs several tactics. Almost all of the rest still get "be careful" (21 of 22).

### Checked against a clear reference [A3a]

There are two hand-labelled sets, reported separately. Each message is labelled with the tactics it uses, under written rules (`data/LABELING.md`). The prompt and model were chosen on a separate 7-message development split, and the test sets were never used for tuning.

- **Real messages:** 18 scams quoted word for word from Malaysian police, bank and news sources (each with its URL in `data/SOURCES.md`), plus 1 genuine notice.
- **Written test cases:** 22 scam and 28 genuine messages written in Malaysian formats, `[TO FILL: who wrote them — Shermaine, or an AI tool she used]`. They are not messages anyone received.

Each message was run 3 times. Results are from the first run unless stated.

| | Real scams (18) | Written cases (22 scam, 28 genuine) |
|---|---|---|
| Scams: "uses scam tactics" | 11 of 18 | 18 of 22 |
| Scams: "be careful" or worse | **17 of 18** | **21 of 22** |
| Genuine wrongly flagged as scam | 0 of 1 | **2 of 28** (7%); 8 of 84 across all 3 runs |
| Genuine marked "be careful" | 1 of 1 | 13 of 28 |
| Same verdict on all 3 runs | 16 of 19 | 41 of 50 |
| Median time | 1.9 s | 1.6 s |

By language (written cases), scams marked "be careful" or worse:

| Language | Result |
|---|---|
| Malay | 9 of 10 |
| Chinese | 5 of 5 |
| Mixed | 5 of 5 |
| English | 2 of 2 |

**Screenshots** (`results/screenshots-*.md`): the 19 real test messages, plus one two-bubble chat, were rendered as phone-chat screenshots.

| | Pasted | Screenshot |
|---|---|---|
| Scams marked "be careful" or worse | 16 of 19 | 18 of 19 |
| Quotes dropped by the code check | 0 | 0 |

The text read from the screenshots matched the real message with a median character similarity of 100%.

### When to rely on it, and when not to [A3b]

- **Scams whose text carries only one tactic.** 6 real scams got "be careful" rather than "uses scam tactics". Five of them contain only one tactic, which the tool found correctly in every case: a link alone (2 "your photo is in a group" messages), easy money alone, a deadline alone, or a sender claim alone. Three of those five are single bubbles from a longer chat. The rule table needs several tactics to say "scam", so treat "be careful" seriously. The sixth (a fake Public Bank points message) was a miss: the AI didn't count "Please log in" as asking for a login.
- **First messages that are only a lure** ("your photo is in a viral group", "wrong number, can we be friends?") carry no tactic in the text, because the link or request comes later. They got "no known tactics". This is the one scam type it misses.
- **Genuine alerts often get "be careful"** (13 of 28 written cases). In 10 of those, the only finding was that the message names a sender, such as a bank or courier, which the tool cannot verify. The advice shown ("check through the official app") is still right, but this would make people ignore the warning if it showed on every alert. Lowering the weight of that tactic is the obvious next change. It wasn't made here, because it would have been tuned on the test results.
- **Run-to-run variation exists even at temperature 0.** 57 of 69 messages got the same verdict on all three runs.
- **Coverage:** tested only on Malay, English and Chinese, and on clean screenshots. Real phone screenshots with clutter are untested. Other scripts are refused rather than guessed.
- **A clean result is never proof of safety**, and the app says so every time.

### AI during development [A4a, A4b]

The code was drafted with an AI coding assistant (Claude). Every AI-written function has unit tests (35 tests).

- **Example 1:** the AI-written function that maps a quoted phrase back to its place in the message failed a test with an emoji before Chinese text. Highlights started one character late, because emoji count as two units in JavaScript strings. **Changed:** the function now maps per unit, with a guard against splitting an emoji (DEVLOG, 21 Nov).
- **Example 2:** an earlier conclusion that "screenshots are weaker than pasted text" came from a single live check. The screenshot evaluation (20 items) didn't support it. **Rejected**, and the claim was removed from the limits.
- `[TO FILL: Shermaine's own review of extractIdentifiers: what she tried, what she found, keep/change/reject.]`

## 5. Access, results, and how it fails

- **Access** [V3]:
  - It's a mobile-first web page with no account needed, in English or Bahasa. You paste text or upload a screenshot.
  - Three examples replay **saved real results**, labelled with the model and date, so visitors don't spend the free quota.
  - Each device is limited to 20 checks an hour.
- **Works start to finish** [R1, R2a-d], all shown live in the video:
  - **R2a:** an English parcel scam gets "uses scam tactics", with 5 tactics marked.
  - **R2b:** a Malay loan request from someone posing as a celebrity, with the page in Bahasa, gets "uses scam tactics", with 3 tactics marked.
  - **R2c:** the same message again gives the same verdict and the same 3 tactics.
  - **R2d:** a two-bubble chat screenshot is read from the image, and the highlights are checked against that text.
- **Fails safely** [R3a, R3b]:
  - **Blurred screenshot:** "couldn't read it, try a sharper one", with no findings shown.
  - **Just a phone or account number:** no AI call is made, and you're sent to Semak Mule.
  - **AI overloaded or broken output:** retry, then the fallback model, then "try again". Your message and last result stay on screen.
- **Privacy:** Gemini's free tier may use inputs to improve Google's products, so the page asks people to remove names, IC and account numbers first.

## Disclosures

- **AI in the product:** Google Gemini API (3.5 Flash-Lite, with 3.5 Flash as fallback).
- **AI in development:** Claude (Anthropic) as a coding and research assistant. It also drafted the tactic labels, which Shermaine reviews.
- **Video narration:** computer-generated with Piper TTS.
- **Test data:** the written test cases are synthetic, as stated above. Screenshots in the screenshot evaluation are renderings of real messages in a generic chat layout.

## Built with

Next.js, TypeScript, Tailwind CSS, Zod, Vitest, Playwright, Gemini API, Vercel, Piper TTS, ffmpeg.
