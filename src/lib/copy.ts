import type { CantTellReason } from "./precheck";
import type { Verdict } from "./verdict";

export type Lang = "en" | "ms";

export const SEMAK_MULE_URL = "https://semakmule.rmp.gov.my/";

export const VERDICT_COPY: Record<Verdict, { title: Record<Lang, string>; body: Record<Lang, string> }> = {
  scam_signs: {
    title: { en: "This message uses scam tactics", ms: "Mesej ini menggunakan taktik penipuan" },
    body: {
      en: "Don't reply, pay or tap any link. If you think it might be real, contact the organisation through its official app or hotline.",
      ms: "Jangan balas, bayar atau tekan pautan. Jika anda rasa ia mungkin benar, hubungi organisasi melalui aplikasi atau talian rasmi.",
    },
  },
  some_signs: {
    title: { en: "Be careful with this one", ms: "Berhati-hati dengan mesej ini" },
    body: {
      en: "Parts of it need care. Real messages can look like this too, so check through the official app or hotline before you act.",
      ms: "Sebahagiannya perlu diberi perhatian. Mesej sebenar juga boleh kelihatan begini, jadi semak melalui aplikasi atau talian rasmi dahulu.",
    },
  },
  no_known_signs: {
    title: { en: "No known tactics found", ms: "Tiada taktik yang dikenali" },
    body: {
      en: "That doesn't make it safe. New scams use tricks this check doesn't know yet. If it asks for money or codes, check with the sender another way.",
      ms: "Ini tidak bermakna ia selamat. Penipuan baharu menggunakan helah yang belum dikenali. Jika ia meminta wang atau kod, semak dengan pengirim melalui cara lain.",
    },
  },
  cant_tell: {
    title: { en: "Can't check this one", ms: "Tidak dapat disemak" },
    body: { en: "", ms: "" },
  },
};

export const CANT_TELL_COPY: Record<CantTellReason, Record<Lang, string>> = {
  too_short: {
    en: "There isn't enough text to check. Paste the whole message.",
    ms: "Teks terlalu pendek untuk disemak. Tampal keseluruhan mesej.",
  },
  identifier_only: {
    en: "This is just a number or link. Look up phone and account numbers on Semak Mule, the police list of numbers reported in scams.",
    ms: "Ini hanya nombor atau pautan. Semak nombor telefon dan akaun di Semak Mule, senarai polis bagi nombor yang dilaporkan dalam penipuan.",
  },
  unsupported_language: {
    en: "This version has only been tested on Malay, English and Chinese messages, so it won't guess on this one.",
    ms: "Versi ini hanya diuji pada mesej Bahasa Melayu, Inggeris dan Cina, jadi ia tidak akan meneka untuk mesej ini.",
  },
  too_long: {
    en: "That's longer than one message. Paste only the message you received.",
    ms: "Teks ini lebih panjang daripada satu mesej. Tampal mesej yang anda terima sahaja.",
  },
  unreadable_image: {
    en: "The message in this screenshot couldn't be read. Try a sharper screenshot, or paste the text instead.",
    ms: "Mesej dalam tangkapan skrin ini tidak dapat dibaca. Cuba tangkapan skrin yang lebih jelas, atau tampal teksnya.",
  },
  model_unavailable: {
    en: "The checker is busy right now. Your message is still here, so try again in a minute.",
    ms: "Penyemak sedang sibuk. Mesej anda masih di sini, jadi cuba lagi sebentar lagi.",
  },
  invalid_model_output: {
    en: "The check didn't finish properly, so nothing is shown rather than a wrong answer. Try again.",
    ms: "Semakan tidak selesai dengan betul, jadi tiada keputusan ditunjukkan dan bukannya jawapan yang salah. Cuba lagi.",
  },
};

export const UI: Record<string, Record<Lang, string>> = {
  headline: {
    en: "Got a strange message? See the tricks in it before you reply.",
    ms: "Dapat mesej pelik? Lihat helah di dalamnya sebelum anda membalas.",
  },
  intro: {
    en: "Paste a WhatsApp, SMS or RCS message, in Malay, English, Chinese or a mix. Each trick is marked on the exact words, next to what a real sender would do.",
    ms: "Tampal mesej WhatsApp, SMS atau RCS, dalam Bahasa Melayu, Inggeris, Cina atau campuran. Setiap helah ditanda pada perkataan sebenar, di sebelah apa yang dilakukan pengirim sebenar.",
  },
  pasteTab: { en: "Paste text", ms: "Tampal teks" },
  imageTab: { en: "Upload screenshot", ms: "Muat naik tangkapan skrin" },
  placeholder: { en: "Paste the message here", ms: "Tampal mesej di sini" },
  check: { en: "Check message", ms: "Semak mesej" },
  checking: { en: "Checking", ms: "Menyemak" },
  tryExample: { en: "Or try an example:", ms: "Atau cuba contoh:" },
  privacy: {
    en: "Remove names, IC and account numbers first. Your message is sent to Google's Gemini to be read.",
    ms: "Buang nama, nombor IC dan akaun dahulu. Mesej anda dihantar ke Gemini Google untuk dibaca.",
  },
  realSender: { en: "A real sender", ms: "Pengirim sebenar" },
  numbersFound: { en: "Numbers and links in this message", ms: "Nombor dan pautan dalam mesej ini" },
  checkOnSemakMule: { en: "Look it up on Semak Mule", ms: "Semak di Semak Mule" },
  dontTap: { en: "Don't tap it. Type the official address yourself.", ms: "Jangan tekan. Taip sendiri alamat rasmi." },
  report: {
    en: "Already lost money? Call the National Scam Response Centre on 997 straight away.",
    ms: "Sudah kehilangan wang? Hubungi Pusat Respons Scam Kebangsaan di 997 segera.",
  },
  previousKept: { en: "Your last result is still below.", ms: "Keputusan terakhir anda masih di bawah." },
  dropped: {
    en: "phrase(s) the AI pointed to weren't in the message, so they were removed.",
    ms: "frasa yang ditunjukkan AI tiada dalam mesej, jadi ia dibuang.",
  },
  chooseImage: { en: "Choose a screenshot (PNG or JPG)", ms: "Pilih tangkapan skrin (PNG atau JPG)" },
  savedResult: { en: "Saved result from", ms: "Keputusan tersimpan dari" },
  checkedWith: { en: "Checked with", ms: "Disemak dengan" },
  sourceLabel: { en: "Message source", ms: "Sumber mesej" },
  fromScreenshot: { en: "Text read from your screenshot", ms: "Teks yang dibaca dari tangkapan skrin anda" },
  noTactics: {
    en: "Nothing in the wording matched a known tactic.",
    ms: "Tiada perkataan yang sepadan dengan taktik yang dikenali.",
  },
  limits: { en: "How reliable is this?", ms: "Sejauh mana ia boleh dipercayai?" },
};
