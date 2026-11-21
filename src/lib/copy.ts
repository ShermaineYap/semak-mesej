import type { CantTellReason } from "./precheck";
import type { Verdict } from "./verdict";

export type Lang = "en" | "ms";

export const SEMAK_MULE_URL = "https://semakmule.rmp.gov.my/";

export const VERDICT_COPY: Record<Verdict, { title: Record<Lang, string>; body: Record<Lang, string> }> = {
  scam_signs: {
    title: { en: "Scam tactics found", ms: "Taktik penipuan dikesan" },
    body: {
      en: "This message uses several tactics scammers rely on. Don't reply, pay or tap any link. Check with the organisation through its official app or hotline.",
      ms: "Mesej ini menggunakan beberapa taktik yang biasa digunakan penipu. Jangan balas, bayar atau tekan pautan. Semak dengan organisasi melalui aplikasi atau talian rasmi.",
    },
  },
  some_signs: {
    title: { en: "Some warning signs", ms: "Ada tanda amaran" },
    body: {
      en: "Some parts of this message need care. Genuine messages can look like this too, so check through the official app or hotline before acting.",
      ms: "Sebahagian mesej ini perlu diberi perhatian. Mesej sebenar juga boleh kelihatan begini, jadi semak melalui aplikasi atau talian rasmi dahulu.",
    },
  },
  no_known_signs: {
    title: { en: "No known tactics found", ms: "Tiada taktik yang dikenali" },
    body: {
      en: "This is not proof the message is safe. New scams may use tactics this check doesn't know. If it asks for money or codes, check with the sender through an official channel.",
      ms: "Ini bukan bukti mesej ini selamat. Penipuan baharu mungkin menggunakan taktik yang tidak dikenali. Jika ia meminta wang atau kod, semak dengan pengirim melalui saluran rasmi.",
    },
  },
  cant_tell: {
    title: { en: "Can't tell", ms: "Tidak dapat dipastikan" },
    body: { en: "", ms: "" },
  },
};

export const CANT_TELL_COPY: Record<CantTellReason, Record<Lang, string>> = {
  too_short: {
    en: "There isn't enough text to check. Paste the whole message.",
    ms: "Teks terlalu pendek untuk disemak. Tampal keseluruhan mesej.",
  },
  identifier_only: {
    en: "This looks like just a number or link. Check phone and account numbers on Semak Mule, the police database of reported numbers.",
    ms: "Ini kelihatan seperti nombor atau pautan sahaja. Semak nombor telefon dan akaun di Semak Mule, pangkalan data polis.",
  },
  unsupported_language: {
    en: "This version has only been tested on Malay, English and Chinese messages, so it won't guess on this one.",
    ms: "Versi ini hanya diuji pada mesej Bahasa Melayu, Inggeris dan Cina, jadi ia tidak akan meneka untuk mesej ini.",
  },
  too_long: {
    en: "That's too long to be one message. Paste just the message you received.",
    ms: "Teks ini terlalu panjang. Tampal mesej yang anda terima sahaja.",
  },
  unreadable_image: {
    en: "The message in this screenshot couldn't be read. Try a clearer screenshot, or paste the text instead.",
    ms: "Mesej dalam tangkapan skrin ini tidak dapat dibaca. Cuba tangkapan skrin yang lebih jelas, atau tampal teksnya.",
  },
  model_unavailable: {
    en: "The checker is busy or offline right now. Your message is still here; try again in a minute.",
    ms: "Penyemak sedang sibuk atau di luar talian. Mesej anda masih di sini; cuba lagi sebentar lagi.",
  },
  invalid_model_output: {
    en: "The check didn't complete properly, so no result is shown rather than a wrong one. Try again.",
    ms: "Semakan tidak lengkap, jadi tiada keputusan ditunjukkan dan bukannya keputusan yang salah. Cuba lagi.",
  },
};

export const UI: Record<string, Record<Lang, string>> = {
  tagline: {
    en: "See the tactics in a suspicious message before you reply.",
    ms: "Lihat taktik dalam mesej yang meragukan sebelum anda membalas.",
  },
  pasteTab: { en: "Paste text", ms: "Tampal teks" },
  imageTab: { en: "Screenshot", ms: "Tangkapan skrin" },
  placeholder: {
    en: "Paste the WhatsApp, SMS or RCS message here…",
    ms: "Tampal mesej WhatsApp, SMS atau RCS di sini…",
  },
  check: { en: "Check message", ms: "Semak mesej" },
  checking: { en: "Checking…", ms: "Menyemak…" },
  privacy: {
    en: "Remove names, IC and account numbers before checking. Messages are sent to Google's Gemini API to be read.",
    ms: "Buang nama, nombor IC dan akaun sebelum menyemak. Mesej dihantar ke API Gemini Google untuk dibaca.",
  },
  thisMessage: { en: "This message", ms: "Mesej ini" },
  genuine: { en: "A genuine sender", ms: "Pengirim sebenar" },
  numbersFound: { en: "Numbers and links in this message", ms: "Nombor dan pautan dalam mesej ini" },
  checkOnSemakMule: { en: "Check on Semak Mule", ms: "Semak di Semak Mule" },
  dontTap: { en: "Don't tap. Type the official address yourself.", ms: "Jangan tekan. Taip sendiri alamat rasmi." },
  report: {
    en: "Lost money? Call the National Scam Response Centre at 997 immediately.",
    ms: "Kehilangan wang? Hubungi Pusat Respons Scam Kebangsaan di 997 segera.",
  },
  previousKept: {
    en: "Your previous result is still shown below.",
    ms: "Keputusan sebelum ini masih ditunjukkan di bawah.",
  },
  dropped: {
    en: "phrase(s) the AI suggested were not found in the message and were removed.",
    ms: "frasa yang dicadangkan AI tidak dijumpai dalam mesej dan telah dibuang.",
  },
  chooseImage: { en: "Choose a screenshot", ms: "Pilih tangkapan skrin" },
};
