import { NextResponse } from "next/server";
import { askModel, MODEL_CHOICES, MODELS, parseChoice } from "@/lib/bench/models";
import { generateTask } from "@/lib/bench/tasks";
import type { Kind } from "@/lib/bench/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: Kind[] = ["closer", "leftmost", "orientation", "stability"];

/** Rebuilds the task from its seed on the server and asks a vision model. The ground truth is never sent. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const choice0 = MODEL_CHOICES.find((c) => c.id === b.model);
    if (!choice0) throw new Error("unknown model");
    const provider = choice0.provider;
    const kind = b.kind as Kind;
    const seed = Number(b.seed);
    if (!KINDS.includes(kind) || !Number.isInteger(seed) || seed < 1) throw new Error("invalid task");
    const key = process.env[MODELS[provider].env];
    if (!key) throw new Error(`${choice0.label} is not configured on the server`);

    const objects = b.objects === undefined ? undefined : Number(b.objects);
    const { task, jpeg } = await generateTask({ kind, seed, objects, lighting: b.lighting === "dim" ? "dim" : "normal" });
    const raw = await askModel(provider, key, jpeg.toString("base64"), task.question, task.options, choice0.id);
    if (!raw.trim()) throw new Error("empty reply from model");
    const choice = parseChoice(raw, task.options.length);
    return NextResponse.json({ provider, model: choice0.id, label: choice0.label, raw: raw.trim(), choice, correct: choice === task.answer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 240) }, { status: 400 });
  }
}
