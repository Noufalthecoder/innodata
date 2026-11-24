import { NextResponse } from "next/server";
import { byokProvider, validKey, validModelId } from "@/lib/bench/byok";
import { askModel, classifyError, MODEL_CHOICES, MODELS, parseChoice, type Provider } from "@/lib/bench/models";
import { generateTask } from "@/lib/bench/tasks";
import type { Kind } from "@/lib/bench/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: Kind[] = ["closer", "leftmost", "orientation", "stability"];

/**
 * Rebuilds the task from its seed on the server and asks a vision model. The ground truth is never sent.
 *
 * Bring Your Own Key: the body may carry { provider, model, apiKey }. The key is used for this one request only:
 * it is never stored, never logged and never returned. Without a key the server's own .env key is used.
 */
export async function POST(req: Request) {
  let label = "the model provider";
  let model: string | undefined;
  let userKey: string | undefined;
  try {
    const b = await req.json();
    let provider: Provider;

    if (b.provider !== undefined) {
      // BYOK route: any model id of a supported provider
      const p = byokProvider(String(b.provider));
      if (!p) return bad("unknown provider");
      if (!validModelId(b.model)) return bad("invalid model id");
      if (b.apiKey !== undefined && b.apiKey !== "" && !validKey(b.apiKey)) return bad(`That doesn't look like a ${p.label} key.`);
      provider = p.id;
      model = b.model;
      label = p.label;
      userKey = b.apiKey || undefined;
    } else {
      const choice = MODEL_CHOICES.find((c) => c.id === b.model);
      if (!choice) return bad("unknown model");
      provider = choice.provider;
      model = choice.id;
      label = choice.label;
    }

    const kind = b.kind as Kind;
    const seed = Number(b.seed);
    if (!KINDS.includes(kind) || !Number.isInteger(seed) || seed < 1) return bad("invalid task");
    const key = userKey ?? process.env[MODELS[provider].env];
    if (!key) return bad(`No key for ${label}. Enter your own key in Model Config.`);

    const objects = b.objects === undefined ? undefined : Number(b.objects);
    const { task, jpeg } = await generateTask({ kind, seed, objects, lighting: b.lighting === "dim" ? "dim" : "normal" });
    const raw = await askModel(provider, key, jpeg.toString("base64"), task.question, task.options, model);
    if (!raw.trim()) return bad(`${label} returned an empty reply.`);
    const choice = parseChoice(raw, task.options.length);
    return NextResponse.json({ provider, model, label, raw: raw.trim(), choice, correct: choice === task.answer, keySource: userKey ? "user" : "server" });
  } catch (e) {
    const { kind, message } = classifyError(label, e, model, userKey);
    return NextResponse.json({ error: message, kind }, { status: 400 });
  }
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
