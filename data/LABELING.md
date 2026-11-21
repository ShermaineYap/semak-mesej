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
