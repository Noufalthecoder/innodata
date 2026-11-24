import { NextResponse } from "next/server";
import { byokProvider, validKey, validModelId } from "@/lib/bench/byok";
import { classifyError, MODELS, pingModel } from "@/lib/bench/models";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * "Test Key": one tiny text request ("reply OK") with the visitor's key, before anything bigger runs.
 * The key is used for this request only. It is never stored, logged or echoed back.
 */
export async function POST(req: Request) {
  let label = "the provider";
  let key: string | undefined;
  let model: string | undefined;
  try {
    const b = await req.json();
    const p = byokProvider(String(b.provider));
    if (!p) return NextResponse.json({ ok: false, kind: "other", error: "Unknown provider." }, { status: 400 });
    label = p.label;
    if (!validModelId(b.model)) return NextResponse.json({ ok: false, kind: "model", error: "Invalid model id." }, { status: 400 });
    model = b.model;
    if (b.apiKey && !validKey(b.apiKey)) return NextResponse.json({ ok: false, kind: "invalid_key", error: `That doesn't look like a ${p.label} key.` }, { status: 400 });
    key = b.apiKey || process.env[MODELS[p.id].env];
    if (!key) return NextResponse.json({ ok: false, kind: "invalid_key", error: `Enter a ${p.label} key to test.` }, { status: 400 });

    const t0 = Date.now();
    const reply = await pingModel(p.id, key, b.model);
    return NextResponse.json({ ok: true, reply: reply.trim().slice(0, 40), ms: Date.now() - t0, keySource: b.apiKey ? "user" : "server" });
  } catch (e) {
    const { kind, message } = classifyError(label, e, model, key);
    return NextResponse.json({ ok: false, kind, error: message }, { status: 200 });
  }
}
