// DEVELOPMENT ONLY. Lets the UI be built and tested without an API key.
// It finds tactics with simple keyword rules; it is not the product's AI and
// is refused in production (see route.ts). Results from it are never reported.

import type { Provider } from "./providers";
import type { ModelOutput } from "./schema";
import type { TacticId } from "./tactics";

const RULES: [TacticId, RegExp][] = [
  ["urgency", /(dalam \d+ jam|within \d+ (?:hours|minutes)|segera|immediately|today only|hari ini juga|urgent)/i],
  ["payment_request", /(bayar [^.,\n]{0,20}|pay [^.,\n]{0,20}|transfer [^.,\n]{0,20}|bank in [^.,\n]{0,20})/i],
  ["credential_request", /((?:masukkan|beri|share|send|enter)[^.\n]{0,15}(?:TAC|OTP|password|kata laluan|PIN))/i],
  ["suspicious_link", /(https?:\/\/\S+|klik pautan[^.\n]{0,20}|click (?:the )?link[^.\n]{0,20})/i],
  ["threat", /(akan dipulangkan|akan dibekukan|will be (?:suspended|frozen|closed)|tindakan undang-undang|legal action|waran tangkap)/i],
  ["impersonation", /^(Pos Malaysia|Maybank|CIMB|LHDN|PDRM|TNB|Shopee|J&T)/im],
];

export function mockProvider(): Provider {
  return {
    name: "mock",
    model: "mock-keywords (dev only)",
    async call(req) {
      const msg = req.userText.match(/<message>\n([\s\S]*)\n<\/message>/)?.[1] ?? "";
      const findings = RULES.flatMap(([tactic, re]) => {
        const m = msg.match(re);
        return m
          ? [{ tactic, quote: m[1] ?? m[0], explanation_en: `Mock finding for ${tactic}.`, explanation_ms: `Dapatan olok-olok: ${tactic}.` }]
          : [];
      });
      const out: ModelOutput = {
        readability: "clear",
        transcript: "",
        language: "mixed",
        message_kind: "development mock",
        claimed_sender: "",
        findings,
      };
      return { rawText: JSON.stringify(out), model: this.model, latencyMs: 5 };
    },
  };
}
