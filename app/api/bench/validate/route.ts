import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateTask } from "@/lib/bench/tasks";
import { deriveAnswer } from "@/lib/bench/truth";
import type { Task } from "@/lib/bench/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** The last full check, reused until the dataset file changes or a fresh run is requested. */
let last: { key: string; report: Record<string, unknown> } | null = null;

/**
 * Re-derives every stored answer with independent code, and rebuilds a sample of tasks from their seeds.
 * Body { fresh: true } always runs the full check; otherwise the last real check of this exact dataset is returned, with its time.
 */
export async function POST(req: Request) {
  const file = path.join(process.cwd(), "public", "bench", "tasks.json");
  if (!existsSync(file)) return NextResponse.json({ error: "No tasks yet. Run: npm run bench:generate" }, { status: 404 });
  const fresh = Boolean(await req.json().then((b) => b?.fresh).catch(() => false));
  const st = statSync(file);
  const key = `${st.size}:${st.mtimeMs}`;
  if (!fresh && last?.key === key) return NextResponse.json({ ...last.report, cached: true });
  const tasks: Task[] = JSON.parse(readFileSync(file, "utf8"));

  const mismatches: string[] = [];
  for (const t of tasks) if (deriveAnswer(t) !== t.answer) mismatches.push(t.id);
  const visibilityFailures = tasks.filter((t) => !t.visibility.every((v) => v.ok)).map((t) => t.id);

  const sample = tasks.filter((_, i) => i % Math.max(1, Math.floor(tasks.length / 8)) === 0).slice(0, 8);
  // rebuild the sample in parallel: each rebuild is independent, and the check is identical
  const rebuilt = await Promise.all(
    sample.map((t) => generateTask({ kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting, stable: t.gen?.stable })),
  );
  const notReproducible = sample.filter((t, i) => JSON.stringify(rebuilt[i].task.objects) !== JSON.stringify(t.objects) || rebuilt[i].task.answer !== t.answer).map((t) => t.id);

  const report = {
    checkedAt: new Date().toISOString(),
    total: tasks.length,
    rederived: { checked: tasks.length, matched: tasks.length - mismatches.length, mismatches },
    visibility: { checked: tasks.length, passed: tasks.length - visibilityFailures.length, failures: visibilityFailures },
    reproducible: { checked: sample.length, matched: sample.length - notReproducible.length, failures: notReproducible, ids: sample.map((t) => t.id) },
  };
  last = { key, report };
  return NextResponse.json({ ...report, cached: false });
}
