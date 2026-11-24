import { NextResponse } from "next/server";
import { MODEL_CHOICES, MODELS } from "@/lib/bench/models";

export const runtime = "nodejs";

/** Lists the models the app can ask and whether each has a key on the server. Never returns the keys. */
export async function GET() {
  const providers = MODEL_CHOICES.map((c) => ({ id: c.id, label: c.label, model: c.id, configured: Boolean(process.env[MODELS[c.provider].env]) }));
  return NextResponse.json({ providers });
}
