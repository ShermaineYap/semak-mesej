// The fixed tactic rubric. The model may only report these tactics,
// and the verdict is computed from them in code (see verdict.ts).

export const TACTIC_IDS = [
  "urgency",
  "impersonation",
  "payment_request",
  "credential_request",
  "suspicious_link",
  "too_good_to_be_true",
  "secrecy_or_channel_switch",
  "threat",
] as const;

export type TacticId = (typeof TACTIC_IDS)[number];

export type TacticGroup = "pressure" | "identity" | "money" | "access" | "lure";

export interface TacticDef {
  id: TacticId;
  group: TacticGroup;
  label: { en: string; ms: string };
  /** What counts. Shown to the model and to users. */
  definition: string;
  /** Points towards the verdict. Tuned on the development set only. */
  weight: number;
  /** What a genuine sender would do instead. Shown beside the card. */
  genuineContrast: { en: string; ms: string };
}

export const TACTICS: Record<TacticId, TacticDef> = {
  urgency: {
    id: "urgency",
    group: "pressure",
    label: { en: "Rushes you", ms: "Mendesak anda" },
    definition:
      "A deadline or time pressure that pushes the reader to act before thinking (e.g. 'within 24 hours', 'segera', 'today only').",
    weight: 1,
    genuineContrast: {
      en: "Real organisations give you time and let you check through their official app or hotline.",
      ms: "Organisasi sebenar memberi masa dan membenarkan anda menyemak melalui aplikasi atau talian rasmi.",
    },
  },
  impersonation: {
    id: "impersonation",
    group: "identity",
    label: { en: "Claims to be someone", ms: "Mengaku sebagai pihak lain" },
    definition:
      "The message claims to come from a bank, government agency, courier, platform, company, or someone the reader knows. This is a claim, not proof either way.",
    weight: 1,
    genuineContrast: {
      en: "A real sender can be checked independently: call the number on the official website, not the one in the message.",
      ms: "Pengirim sebenar boleh disemak sendiri: hubungi nombor di laman web rasmi, bukan nombor dalam mesej.",
    },
  },
  payment_request: {
    id: "payment_request",
    group: "money",
    label: { en: "Asks for money", ms: "Meminta wang" },
    definition:
      "Asks the reader to pay, transfer, deposit, top up, or settle a fee or fine.",
    weight: 2,
    genuineContrast: {
      en: "Genuine bills are paid inside the official app or portal, never to a personal account.",
      ms: "Bil sebenar dibayar dalam aplikasi atau portal rasmi, bukan ke akaun peribadi.",
    },
  },
  credential_request: {
    id: "credential_request",
    group: "access",
    label: { en: "Asks for codes or logins", ms: "Meminta kod atau log masuk" },
    definition:
      "Asks for an OTP/TAC, password, PIN, IC number, card number or login, or asks the reader to install an app or APK. A warning such as 'never share your TAC' is NOT a request.",
    weight: 3,
    genuineContrast: {
      en: "Banks and agencies never ask for your OTP, TAC or password by message.",
      ms: "Bank dan agensi tidak pernah meminta OTP, TAC atau kata laluan melalui mesej.",
    },
  },
  suspicious_link: {
    id: "suspicious_link",
    group: "access",
    label: { en: "Pushes a link", ms: "Mendesak klik pautan" },
    definition:
      "Asks the reader to click a link, scan a code, or download a file.",
    weight: 1,
    genuineContrast: {
      en: "Type the official address yourself or open the official app instead of tapping the link.",
      ms: "Taip sendiri alamat rasmi atau buka aplikasi rasmi, jangan tekan pautan.",
    },
  },
  too_good_to_be_true: {
    id: "too_good_to_be_true",
    group: "lure",
    label: { en: "Too good to be true", ms: "Terlalu indah untuk jadi benar" },
    definition:
      "A prize, refund owed, unusually high pay or returns, or easy money for little work.",
    weight: 2,
    genuineContrast: {
      en: "Real jobs and refunds don't ask you to pay first or chase you by message.",
      ms: "Kerja dan bayaran balik sebenar tidak meminta anda bayar dahulu.",
    },
  },
  secrecy_or_channel_switch: {
    id: "secrecy_or_channel_switch",
    group: "pressure",
    label: { en: "Keeps you isolated", ms: "Mengasingkan anda" },
    definition:
      "Tells the reader to keep it secret, not to contact the bank or family, or to move to Telegram, WhatsApp or another number.",
    weight: 3,
    genuineContrast: {
      en: "A genuine sender is happy for you to ask family or call the official hotline first.",
      ms: "Pengirim sebenar tidak kisah anda bertanya keluarga atau menghubungi talian rasmi dahulu.",
    },
  },
  threat: {
    id: "threat",
    group: "pressure",
    label: { en: "Threatens you", ms: "Mengugut anda" },
    definition:
      "Threatens arrest, legal action, a fine, a frozen or closed account, a summons, or blacklisting.",
    weight: 2,
    genuineContrast: {
      en: "Police and courts don't settle cases by message or ask you to transfer money to clear your name.",
      ms: "Polis dan mahkamah tidak menyelesaikan kes melalui mesej atau meminta pindahan wang.",
    },
  },
};

export function isTacticId(x: unknown): x is TacticId {
  return typeof x === "string" && (TACTIC_IDS as readonly string[]).includes(x);
}
