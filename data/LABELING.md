# Labelling rules

Each message in `messages.jsonl` is labelled with the tactics the **text itself** uses, using the definitions in `src/lib/tactics.ts`. These rules settle the borderline cases. Every message they affected has a `label_note`.

Labels were drafted by an AI research assistant from public sources, then the rules below were applied (21 Nov 2026), and are reviewed by Shermaine. Where she changes a label, the change is recorded here.

| Rule | Decision | Messages |
|---|---|---|
| R1 | Asking the reader to **log in or verify their identity through a link** counts as `credential_request` (as well as `suspicious_link`). | S001, S002, S003, S006, S015 |
| R2 | Saying the reader **must bear a cost or fee** counts as `payment_request`, even without the word "pay". | S004 |
| R3 | **"Will expire"** with no deadline and no push to act now is not `urgency`. "Expiring soon, act now" is. | S014 (removed), S011 (kept) |
| R4 | **Impersonation must be in the text.** A spoofed sender ID or short code doesn't count, because the tool only sees the text. | S011 (removed) |
| R5 | A **threatened loss** (parcel returned, features disabled, account suspended) counts as `threat`. The definition was widened to say so before any evaluation was run. | S005, S001-S003 |
| R6 | **Easy money for a trivial task** (paid RM30 to subscribe to two channels; paid within minutes) counts as `too_good_to_be_true`. | S009, S025 |

## Deliberate hard cases

- **S019, S027**: opening lures of the "your photo is in a viral group" scam. No rubric tactic is in the text; the link arrives later. They stay in the set so the evaluation measures this limit honestly instead of hiding it.

## Inclusion decisions

- **S024**: an SMS impersonating PDRM, reported by drivers entering Johor from Singapore. Kept: it was received in Malaysia.
- **S010, S013, S016, S029**: not verbatim (paraphrased, translated, or an illustrative example). Excluded from both splits.

## Splits

`make_split.py` assigns about 1 in 3 messages to `dev` (used for writing the prompt and choosing the model) and the rest to `test` (only run for the reported results). Messages from the same chat stay in the same split. Existing assignments never change.

## Synthetic test cases (added 22 Nov 2026)

`data/synthetic/scam_test_set_synthetic.csv` holds 50 **written** test cases (28 genuine, 22 scam), written by Shermaine; they are not messages anyone received. They are imported with ids `XG01`-`XG28` and `XS01`-`XS22`, marked `synthetic: true`, put in their own `synth` split, and **reported separately** from the real messages. They were never used to choose the prompt, model or weights.

Tactic labels were drafted by Claude under the rules above plus R7-R10 below, for Shermaine to review. Labels describe what the text does, so genuine messages carry tactics too (a real TNB bill makes a payment request and claims to be TNB). Whether a message is a scam is the separate `class` field.

| Rule | Decision | Messages |
|---|---|---|
| R7 | An **ordinary due date** weeks away ("pay before 15/12 via myTNB") is not `urgency`. "Today", "within 24 hours", "segera", "asap" are. | XG06, XG17, XG24 |
| R8 | A **domain or link the reader is told to visit** counts as `suspicious_link`, even when it's the real official site. (The tactic is "directs you to a link"; the verdict rules weigh it lightly.) | XG09, XG26 |
| R9 | In chats, a **contact name prefix** ("Mak:", "Mama:") is how the chat app shows the sender, not a claim in the text, so it isn't `impersonation`. Claiming a new number ("ni nombor baru adik") is. | XG19-XG22, XS11, XS20 |
| R10 | Telling the reader to **contact someone on another number or app** (call "Inspektor Rahman", add WhatsApp, join Telegram) counts as `secrecy_or_channel_switch`. | XS03, XS04, XS08, XS09, XS10, XS18 |

XS17 (a "wrong number, can we be friends?" romance opener) has no rubric tactic in the text, like the real lures S019 and S027.
