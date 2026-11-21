// Unit tests for the deterministic parts. Messages here are written for the
// tests; they are NOT part of the measured evaluation set.

import { describe, expect, it } from "vitest";
import { locateQuote } from "../verify";
import { extractIdentifiers } from "../extract";
import { precheckText, wordCount } from "../precheck";
import { decideVerdict, scoreTactics, SCAM_THRESHOLD } from "../verdict";
import { analyze, verifyFindings } from "../analyze";
import type { Provider } from "../providers";
import { ProviderError } from "../providers";
import type { ModelOutput } from "../schema";

const PARCEL =
  "Pos Malaysia: Bungkusan anda tertahan kerana alamat tidak lengkap. Sila kemaskini dalam 24 jam di https://pos-my.top/track dan bayar RM1.50, jika tidak bungkusan akan dipulangkan.";

describe("locateQuote", () => {
  it("finds an exact phrase and returns the original span", () => {
    const span = locateQuote(PARCEL, "dalam 24 jam");
    expect(span).not.toBeNull();
    expect(PARCEL.slice(span!.start, span!.end)).toBe("dalam 24 jam");
  });

  it("ignores case, extra spaces and curly quotes", () => {
    const text = "Your  account   will be SUSPENDED today. Reply “YES” now";
    const span = locateQuote(text, "account will be suspended today");
    expect(text.slice(span!.start, span!.end)).toBe("account   will be SUSPENDED today");
    expect(locateQuote(text, 'Reply "YES" now')).not.toBeNull();
  });

  it("rejects a phrase that is not in the message (hallucinated quote)", () => {
    expect(locateQuote(PARCEL, "akaun anda akan dibekukan")).toBeNull();
  });

  it("rejects a translated quote", () => {
    expect(locateQuote(PARCEL, "within 24 hours")).toBeNull();
  });

  it("matches a quote with an ellipsis if the parts appear in order", () => {
    const span = locateQuote(PARCEL, "Sila kemaskini ... bayar RM1.50");
    expect(span).not.toBeNull();
    expect(locateQuote(PARCEL, "bayar RM1.50 ... Sila kemaskini")).toBeNull();
  });

  it("rejects empty and too-short fragments", () => {
    expect(locateQuote(PARCEL, "")).toBeNull();
    expect(locateQuote(PARCEL, "...")).toBeNull();
    expect(locateQuote(PARCEL, "di")).toBeNull();
  });

  it("works with Chinese and emoji without breaking characters", () => {
    const text = "🎉恭喜您中奖了！请点击链接领取奖金 RM5000";
    const span = locateQuote(text, "请点击链接领取奖金");
    expect(text.slice(span!.start, span!.end)).toBe("请点击链接领取奖金");
  });
});

describe("extractIdentifiers", () => {
  it("finds links including defanged ones", () => {
    const ids = extractIdentifiers("Klik https://pos-my.top/track atau maybank2u-secure[.]com sekarang");
    expect(ids.links).toContain("https://pos-my.top/track");
    expect(ids.links.some((l) => l.includes("maybank2u-secure[.]com"))).toBe(true);
  });

  it("finds Malaysian phone numbers and keeps them out of accounts", () => {
    const ids = extractIdentifiers("Call 012-345 6789 or +60 3-2345 6789. Bank in to 1234 5678 9012");
    expect(ids.phones.length).toBeGreaterThanOrEqual(1);
    expect(ids.accounts).toContain("1234 5678 9012");
    expect(ids.accounts.some((a) => a.replace(/\D/g, "") === "0123456789")).toBe(false);
  });

  it("does not treat money amounts as accounts", () => {
    const ids = extractIdentifiers("Bayar RM1.50 sahaja");
    expect(ids.accounts).toHaveLength(0);
  });
});

describe("precheckText", () => {
  it("accepts an ordinary message", () => {
    expect(precheckText(PARCEL).ok).toBe(true);
  });

  it("refuses very short text", () => {
    const r = precheckText("hi");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_short");
  });

  it("sends a bare phone number or account to Semak Mule instead", () => {
    const r = precheckText("012-345 6789");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("identifier_only");
      expect(r.identifiers.phones).toHaveLength(1);
    }
    const r2 = precheckText("acc 1234 5678 9012 ok?");
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("identifier_only");
  });

  it("refuses scripts that are not in the test set", () => {
    const r = precheckText("உங்கள் வங்கி கணக்கு முடக்கப்பட்டுள்ளது உடனே இணைப்பைக் கிளிக் செய்யவும்");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unsupported_language");
  });

  it("accepts Chinese and mixed messages", () => {
    expect(precheckText("您的包裹因地址不完整被扣留，请在24小时内更新地址").ok).toBe(true);
    expect(precheckText("Boss, saya dah transfer, pls check 银行 ya, urgent").ok).toBe(true);
  });

  it("refuses very long text", () => {
    const r = precheckText("word ".repeat(1200));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_long");
  });

  it("counts words across scripts", () => {
    expect(wordCount("hello there my friend")).toBe(4);
    expect(wordCount("请在二十四小时内更新")).toBeGreaterThanOrEqual(4);
  });
});

describe("decideVerdict", () => {
  it("never returns a 'safe' verdict", () => {
    expect(decideVerdict([]).verdict).toBe("no_known_signs");
  });

  it("flags strong combinations", () => {
    expect(decideVerdict(["credential_request", "urgency"]).verdict).toBe("scam_signs");
    expect(decideVerdict(["payment_request", "threat"]).verdict).toBe("scam_signs");
  });

  it("treats a lone payment request (e.g. a real bill) as some signs, not scam", () => {
    expect(decideVerdict(["payment_request", "impersonation"]).verdict).toBe("some_signs");
  });

  it("counts each tactic once", () => {
    expect(scoreTactics(["urgency", "urgency", "urgency", "urgency"])).toBe(1);
  });

  it("threshold is what the docs say", () => {
    expect(SCAM_THRESHOLD).toBe(4);
  });
});

// ---------- pipeline with a fake model ----------

function fakeProvider(outputs: (string | Error)[]): Provider & { calls: number } {
  const p = {
    name: "fake",
    model: "fake-1",
    calls: 0,
    async call() {
      const out = outputs[Math.min(p.calls, outputs.length - 1)];
      p.calls++;
      if (out instanceof Error) throw out;
      return { rawText: out, model: "fake-1", latencyMs: 1 };
    },
  };
  return p;
}

function modelOut(partial: Partial<ModelOutput>): string {
  const full: ModelOutput = {
    readability: "clear",
    transcript: "",
    language: "ms",
    message_kind: "parcel delivery fee",
    claimed_sender: "Pos Malaysia",
    findings: [],
    ...partial,
  };
  return JSON.stringify(full);
}

describe("analyze pipeline", () => {
  it("keeps grounded findings, drops a hallucinated one, and decides in code", async () => {
    const p = fakeProvider([
      modelOut({
        findings: [
          { tactic: "urgency", quote: "dalam 24 jam", explanation_en: "Deadline.", explanation_ms: "Tarikh akhir." },
          { tactic: "payment_request", quote: "bayar RM1.50", explanation_en: "Asks to pay.", explanation_ms: "Minta bayar." },
          { tactic: "suspicious_link", quote: "https://pos-my.top/track", explanation_en: "Link.", explanation_ms: "Pautan." },
          { tactic: "threat", quote: "akaun anda akan disekat", explanation_en: "Not in text.", explanation_ms: "Tiada." },
        ],
      }),
    ]);
    const r = await analyze({ text: PARCEL }, p);
    expect(r.findings.map((f) => f.tactic).sort()).toEqual(["payment_request", "suspicious_link", "urgency"]);
    expect(r.droppedFindings).toEqual([{ tactic: "threat", quote: "akaun anda akan disekat" }]);
    expect(r.verdict.verdict).toBe("scam_signs");
    expect(r.identifiers.links).toContain("https://pos-my.top/track");
  });

  it("does not call the model for a bare number", async () => {
    const p = fakeProvider([modelOut({})]);
    const r = await analyze({ text: "0123456789" }, p);
    expect(p.calls).toBe(0);
    expect(r.verdict).toEqual({ verdict: "cant_tell", score: 0, reason: "identifier_only" });
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    const p = fakeProvider(["not json", modelOut({})]);
    const r = await analyze({ text: PARCEL }, p);
    expect(p.calls).toBe(2);
    expect(r.verdict.verdict).toBe("no_known_signs");
    expect(r.meta.attempts).toBe(2);
  });

  it("gives up safely after two invalid outputs", async () => {
    const p = fakeProvider(["{}", '{"findings": "nope"}']);
    const r = await analyze({ text: PARCEL }, p);
    expect(r.verdict).toEqual({ verdict: "cant_tell", score: 0, reason: "invalid_model_output" });
    expect(r.text).toBe(PARCEL); // the user's input is preserved
  });

  it("reports the model as unavailable on timeout or rate limit, without retrying", async () => {
    const p = fakeProvider([new ProviderError("timed out", "unavailable")]);
    const r = await analyze({ text: PARCEL }, p);
    expect(p.calls).toBe(1);
    expect(r.verdict.reason).toBe("model_unavailable");
  });

  it("refuses an unreadable screenshot", async () => {
    const p = fakeProvider([modelOut({ readability: "unreadable", transcript: "" })]);
    const r = await analyze({ image: { mimeType: "image/png", base64: "AAAA" } }, p);
    expect(r.verdict.reason).toBe("unreadable_image");
  });

  it("checks screenshot quotes against the transcript", async () => {
    const p = fakeProvider([
      modelOut({
        transcript: PARCEL,
        findings: [
          { tactic: "urgency", quote: "dalam 24 jam", explanation_en: "x", explanation_ms: "y" },
          { tactic: "credential_request", quote: "masukkan TAC anda", explanation_en: "x", explanation_ms: "y" },
        ],
      }),
    ]);
    const r = await analyze({ image: { mimeType: "image/png", base64: "AAAA" } }, p);
    expect(r.source).toBe("image");
    expect(r.findings.map((f) => f.tactic)).toEqual(["urgency"]);
    expect(r.droppedFindings).toHaveLength(1);
  });

  it("verifyFindings keeps only the first finding per tactic", () => {
    const { kept } = verifyFindings(PARCEL, [
      { tactic: "urgency", quote: "dalam 24 jam", explanation_en: "", explanation_ms: "" },
      { tactic: "urgency", quote: "jika tidak", explanation_en: "", explanation_ms: "" },
    ]);
    expect(kept).toHaveLength(1);
  });
});
