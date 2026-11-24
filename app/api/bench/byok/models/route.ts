import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** OpenRouter's public model list (no key needed), filtered to models that accept images. Cached for 10 minutes. */
let cache: { at: number; models: { id: string; label: string; free: boolean }[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 10 * 60_000) return NextResponse.json({ models: cache.models });
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(6000) });
    const j = (await r.json()) as { data?: { id: string; name?: string; architecture?: { input_modalities?: string[] }; pricing?: { prompt?: string } }[] };
    const models = (j.data ?? [])
      .filter((m) => m.architecture?.input_modalities?.includes("image"))
      .map((m) => ({ id: m.id, label: m.id, free: m.id.endsWith(":free") || m.pricing?.prompt === "0" }))
      .sort((a, b) => Number(b.free) - Number(a.free) || a.id.localeCompare(b.id))
      .slice(0, 150);
    if (!models.length) throw new Error("empty list");
    cache = { at: Date.now(), models };
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
