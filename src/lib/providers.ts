// Model providers. Keys live only in server environment variables.

export interface ModelRequest {
  system: string;
  userText: string;
  image?: { mimeType: string; base64: string };
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}

export interface ModelResponse {
  rawText: string;
  model: string;
  latencyMs: number;
}

export interface Provider {
  name: string;
  model: string;
  call(req: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "rate_limited" | "bad_response",
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 25_000;

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctrl.abort());
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ProviderError(
      `Request failed: ${(e as Error).name === "AbortError" ? "timed out" : (e as Error).message}`,
      "unavailable",
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new ProviderError("Rate limited", "rate_limited");
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new ProviderError(`HTTP ${res.status}: ${detail}`, "unavailable");
  }
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gemini with overload handling: on 503/429 the same model is retried once
 * after a pause, then the fallback model is tried. The model that actually
 * answered is reported in the response.
 */
export function geminiProvider(
  apiKey: string,
  model: string,
  opts: { fallbackModel?: string; thinkingLevel?: string; retryDelayMs?: number } = {},
): Provider {
  const thinkingLevel = opts.thinkingLevel ?? "low";
  const retryDelayMs = opts.retryDelayMs ?? 2000;

  async function once(m: string, req: ModelRequest, signal?: AbortSignal): Promise<string> {
    const parts: unknown[] = [{ text: req.userText }];
    if (req.image) {
      parts.push({ inline_data: { mime_type: req.image.mimeType, data: req.image.base64 } });
    }
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: req.jsonSchema,
    };
    // Gemini 3.x reasons before answering; "low" keeps latency usable.
    if (/gemini-3/.test(m) && thinkingLevel !== "default") {
      generationConfig.thinkingConfig = { thinkingLevel };
    }
    const data = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,
      { "x-goog-api-key": apiKey },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts }],
        generationConfig,
      },
      signal,
    )) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("") ?? "";
    if (!text) {
      throw new ProviderError(
        `Empty response (finishReason: ${data.candidates?.[0]?.finishReason ?? "none"})`,
        "bad_response",
      );
    }
    return text;
  }

  return {
    name: "gemini",
    model,
    async call(req, signal) {
      const t0 = Date.now();
      const plan = [model, model, ...(opts.fallbackModel ? [opts.fallbackModel] : [])];
      let lastErr: unknown;
      for (let i = 0; i < plan.length; i++) {
        try {
          const rawText = await once(plan[i], req, signal);
          return { rawText, model: plan[i], latencyMs: Date.now() - t0 };
        } catch (e) {
          lastErr = e;
          const transient =
            e instanceof ProviderError && (e.kind === "rate_limited" || /HTTP 503|HTTP 500|timed out/.test(e.message));
          if (!transient) throw e;
          if (i < plan.length - 1 && plan[i + 1] === plan[i]) await sleep(retryDelayMs);
        }
      }
      throw lastErr;
    },
  };
}

// Groq exposes an OpenAI-compatible API.
export function groqProvider(apiKey: string, model: string): Provider {
  return {
    name: "groq",
    model,
    async call(req, signal) {
      const t0 = Date.now();
      const content: unknown[] = [{ type: "text", text: req.userText }];
      if (req.image) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${req.image.mimeType};base64,${req.image.base64}` },
        });
      }
      const data = (await postJson(
        "https://api.groq.com/openai/v1/chat/completions",
        { authorization: `Bearer ${apiKey}` },
        {
          model,
          temperature: 0,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.image ? content : req.userText },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: req.schemaName, schema: req.jsonSchema, strict: true },
          },
        },
        signal,
      )) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new ProviderError("Empty response", "bad_response");
      return { rawText: text, model, latencyMs: Date.now() - t0 };
    },
  };
}

/** Picks the provider from environment variables. Returns null if none is configured. */
export function providerFromEnv(which = process.env.MODEL_PROVIDER ?? "gemini"): Provider | null {
  if (which === "gemini" && process.env.GEMINI_API_KEY) {
    return geminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite", {
      fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash",
      thinkingLevel: process.env.GEMINI_THINKING ?? "low",
    });
  }
  if (which === "groq" && process.env.GROQ_API_KEY) {
    return groqProvider(process.env.GROQ_API_KEY, process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct");
  }
  return null;
}
