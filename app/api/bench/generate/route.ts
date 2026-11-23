import { NextResponse } from "next/server";
import { generateTask } from "@/lib/bench/tasks";
import type { Kind } from "@/lib/bench/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: Kind[] = ["closer", "leftmost", "orientation", "stability"];

function parseGen(b: Record<string, unknown>) {
  const kind = b.kind as Kind;
  const seed = Number(b.seed);
  const objects = b.objects === undefined ? undefined : Number(b.objects);
  const lighting = b.lighting === "dim" ? "dim" : "normal";
  if (!KINDS.includes(kind)) throw new Error("invalid kind");
  if (!Number.isInteger(seed) || seed < 1 || seed > 1_000_000_000) throw new Error("invalid seed");
  if (objects !== undefined && (!Number.isInteger(objects) || objects < 2 || objects > 5)) throw new Error("objects must be 2-5");
  return { kind, seed, objects, lighting } as const;
}

export async function POST(req: Request) {
  try {
    const opts = parseGen(await req.json());
    const { task, jpeg } = await generateTask(opts);
    return NextResponse.json({ task: { ...task, image: `data:image/jpeg;base64,${jpeg.toString("base64")}` } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
