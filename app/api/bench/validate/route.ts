import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateTask } from "@/lib/bench/tasks";
import { deriveAnswer } from "@/lib/bench/truth";
import type { Task } from "@/lib/bench/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Re-derives every stored answer with independent code, and rebuilds a sample of tasks from their seeds. */
export async function POST() {
  const file = path.join(process.cwd(), "public", "bench", "tasks.json");
  if (!existsSync(file)) return NextResponse.json({ error: "No tasks yet. Run: npm run bench:generate" }, { status: 404 });
  const tasks: Task[] = JSON.parse(readFileSync(file, "utf8"));

  const mismatches: string[] = [];
  for (const t of tasks) if (deriveAnswer(t) !== t.answer) mismatches.push(t.id);
  const visibilityFailures = tasks.filter((t) => !t.visibility.every((v) => v.ok)).map((t) => t.id);

  const sample = tasks.filter((_, i) => i % Math.max(1, Math.floor(tasks.length / 8)) === 0).slice(0, 8);
  const notReproducible: string[] = [];
  for (const t of sample) {
    const { task } = await generateTask({ kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting, stable: t.gen?.stable });
    if (JSON.stringify(task.objects) !== JSON.stringify(t.objects) || task.answer !== t.answer) notReproducible.push(t.id);
  }

  return NextResponse.json({
    total: tasks.length,
    rederived: { checked: tasks.length, matched: tasks.length - mismatches.length, mismatches },
    visibility: { checked: tasks.length, passed: tasks.length - visibilityFailures.length, failures: visibilityFailures },
    reproducible: { checked: sample.length, matched: sample.length - notReproducible.length, failures: notReproducible, ids: sample.map((t) => t.id) },
  });
}
