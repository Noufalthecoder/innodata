import { NextResponse } from "next/server";
import { MODEL_CHOICES, MODELS } from "@/lib/bench/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Some networks (school or office filters) answer for models.github.ai with a plain "OK" page.
 * Probe it once, cache the result briefly, and report it, so the app never offers a route that cannot work.
 */
let github: { ok: boolean; at: number } | null = null;
async function githubReachable(token: string): Promise<boolean> {
  if (github && Date.now() - github.at < 5 * 60_000) return github.ok;
  let ok = false;
  try {
    const r = await fetch("https://models.github.ai/catalog/models", { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
    ok = r.ok && Array.isArray(JSON.parse(await r.text()));
  } catch {
    ok = false;
  }
  github = { ok, at: Date.now() };
  return ok;
}

/** Lists the models the app can ask and whether each can be used. Never returns the keys. */
export async function GET() {
  const token = process.env[MODELS.github.env];
  const ghOk = token ? await githubReachable(token) : false;
  const providers = MODEL_CHOICES.map((c) => {
    const hasKey = Boolean(process.env[MODELS[c.provider].env]);
    const unreachable = c.provider === "github" && hasKey && !ghOk;
    return { id: c.id, label: c.label, model: c.id, configured: hasKey && !unreachable, note: unreachable ? "GitHub Models is unreachable from this network" : undefined };
  });
  return NextResponse.json({ providers });
}
