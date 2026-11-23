import { NextResponse } from "next/server";
import { MODELS, type Provider } from "@/lib/bench/models";

export const runtime = "nodejs";

/** Reports which providers have a key configured. Never returns the keys themselves. */
export async function GET() {
  const providers = (Object.keys(MODELS) as Provider[]).map((id) => ({ id, label: MODELS[id].label, model: MODELS[id].model, configured: Boolean(process.env[MODELS[id].env]) }));
  return NextResponse.json({ providers });
}
