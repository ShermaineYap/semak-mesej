import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiProvider, ProviderError } from "../providers";

const REQ = { system: "s", userText: "u", jsonSchema: {}, schemaName: "x" };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
const ok = (text: string) => reply(200, { candidates: [{ content: { parts: [{ text }] } }] });
const overloaded = () => reply(503, { error: { message: "high demand" } });

afterEach(() => vi.unstubAllGlobals());

describe("geminiProvider overload handling", () => {
  it("retries the same model once after a 503", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(ok("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const p = geminiProvider("k", "main", { fallbackModel: "lite", retryDelayMs: 0 });
    const r = await p.call(REQ);
    expect(r.model).toBe("main");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the second model and reports it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(overloaded())
      .mockResolvedValueOnce(ok("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const p = geminiProvider("k", "main", { fallbackModel: "lite", retryDelayMs: 0 });
    const r = await p.call(REQ);
    expect(r.model).toBe("lite");
    expect(String(fetchMock.mock.calls[2][0])).toContain("/models/lite:");
  });

  it("gives up as unavailable when every attempt is overloaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => overloaded()));
    const p = geminiProvider("k", "main", { fallbackModel: "lite", retryDelayMs: 0 });
    await expect(p.call(REQ)).rejects.toBeInstanceOf(ProviderError);
  });

  it("does not retry a retired model (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(404, { error: { message: "gone" } }));
    vi.stubGlobal("fetch", fetchMock);
    const p = geminiProvider("k", "main", { fallbackModel: "lite", retryDelayMs: 0 });
    await expect(p.call(REQ)).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks Gemini 3 models for low reasoning and ignores thought parts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply(200, { candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: '{"a":1}' }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = geminiProvider("k", "gemini-3.5-flash", {});
    const r = await p.call(REQ);
    expect(r.rawText).toBe('{"a":1}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });
});
