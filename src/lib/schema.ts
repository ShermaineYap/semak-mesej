import { z } from "zod";
import { TACTIC_IDS } from "./tactics";

// What the model must return. It never returns a verdict: code decides.
export const ModelFinding = z.object({
  tactic: z.enum(TACTIC_IDS),
  quote: z.string(),
  explanation_en: z.string(),
  explanation_ms: z.string(),
});

export const ModelOutput = z.object({
  readability: z.enum(["clear", "partial", "unreadable"]),
  transcript: z.string(),
  language: z.enum(["ms", "en", "zh", "ta", "mixed", "other"]),
  message_kind: z.string(),
  claimed_sender: z.string(),
  findings: z.array(ModelFinding),
});

export type ModelOutput = z.infer<typeof ModelOutput>;
export type ModelFinding = z.infer<typeof ModelFinding>;

// Hand-written JSON Schema so it fits both Gemini's responseJsonSchema
// and Groq/OpenAI strict mode (all fields required, no extra properties).
export const MODEL_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "readability",
    "transcript",
    "language",
    "message_kind",
    "claimed_sender",
    "findings",
  ],
  properties: {
    readability: {
      type: "string",
      enum: ["clear", "partial", "unreadable"],
      description: "For screenshots: can you read the message text? For pasted text always 'clear'.",
    },
    transcript: {
      type: "string",
      description: "For screenshots: the message text exactly as shown, line breaks kept. For pasted text: an empty string.",
    },
    language: { type: "string", enum: ["ms", "en", "zh", "ta", "mixed", "other"] },
    message_kind: {
      type: "string",
      description: "A few words: what the message is about, e.g. 'parcel delivery fee'.",
    },
    claimed_sender: {
      type: "string",
      description: "Who the message says it is from, or an empty string.",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tactic", "quote", "explanation_en", "explanation_ms"],
        properties: {
          tactic: { type: "string", enum: [...TACTIC_IDS] },
          quote: {
            type: "string",
            description: "The shortest exact phrase from the message that shows this tactic, copied character for character, at most 20 words.",
          },
          explanation_en: { type: "string", description: "One short plain-English sentence." },
          explanation_ms: { type: "string", description: "The same sentence in simple Bahasa Malaysia." },
        },
      },
    },
  },
} as const;

// Baseline used only in the evaluation: a plain "is this a scam?" prompt.
export const BaselineOutput = z.object({ is_scam: z.boolean() });
export const BASELINE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_scam"],
  properties: { is_scam: { type: "boolean" } },
} as const;
