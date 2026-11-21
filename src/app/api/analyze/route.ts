import { NextResponse } from "next/server";
import { z } from "zod";
import { analyze } from "@/lib/analyze";
import { providerFromEnv } from "@/lib/providers";
import { mockProvider } from "@/lib/mockProvider";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3_000_000; // stays under Vercel's 4.5 MB body limit after base64
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const Body = z.union([
  z.object({ text: z.string().max(20_000) }),
  z.object({
    image: z.object({
      mimeType: z.enum(IMAGE_TYPES),
      base64: z.string().min(4),
    }),
  }),
]);

// Simple per-instance limit so a public demo can't drain the free quota.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_HOUR ?? 20);
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many checks from this device. Try the samples, or come back in an hour." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Send either text or one image (PNG, JPEG or WebP)." }, { status: 400 });
  }

  if ("image" in body && Math.floor((body.image.base64.length * 3) / 4) > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image_too_large", message: "That screenshot is too large. Crop it to just the message (under 3 MB)." }, { status: 413 });
  }

  const wantMock = process.env.MODEL_PROVIDER === "mock";
  if (wantMock && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "misconfigured", message: "Mock provider is not allowed in production." }, { status: 500 });
  }
  const provider = wantMock ? mockProvider() : providerFromEnv();
  if (!provider) {
    return NextResponse.json({ error: "no_model", message: "Live checking isn't set up here. Try the samples instead." }, { status: 503 });
  }

  const result = await analyze("image" in body ? { image: body.image } : { text: body.text }, provider, req.signal);
  return NextResponse.json(result);
}
