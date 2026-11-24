import { NextResponse } from "next/server";
import { BYOK_PROVIDERS } from "@/lib/bench/byok";
import { MODEL_CHOICES, MODELS } from "@/lib/bench/models";

export const runtime = "nodejs";

/** Lists the models the app can ask and whether each has a key on the server. Never returns the keys. */
export async function GET() {
  const providers = MODEL_CHOICES.map((c) => ({ id: c.id, label: c.label, model: c.id, configured: Boolean(process.env[MODELS[c.provider].env]) }));
  // for Bring Your Own Key: which providers can fall back to a server key when the visitor enters none
  const serverKeys = Object.fromEntries(BYOK_PROVIDERS.map((p) => [p.id, Boolean(process.env[MODELS[p.id].env])]));
  return NextResponse.json({ providers, serverKeys });
}
