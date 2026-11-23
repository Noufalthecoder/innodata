// npm run bench:report
// Aggregates results/*.json into public/bench/summary.json (accuracy by model, tier, kind and difficulty).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Task } from "../../lib/bench/types";

type Row = { id: string; choice: number | null; correct: boolean; error?: string };

const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
const byId = new Map(tasks.map((t) => [t.id, t]));
const dir = "public/bench/results";
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

const acc = (rows: Row[]) => ({ n: rows.length, correct: rows.filter((r) => r.correct).length, accuracy: rows.length ? rows.filter((r) => r.correct).length / rows.length : 0 });

const models = files.map((f) => {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { provider: string; model: string; results: Row[] };
  const rows = j.results.filter((r) => !r.error);
  const group = (key: (t: Task) => string) => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) (g[key(byId.get(r.id)!)] ??= []).push(r);
    return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, acc(v)]));
  };
  return {
    provider: j.provider,
    model: j.model,
    overall: acc(rows),
    errors: j.results.length - rows.length,
    byTier: group((t) => `tier${t.tier}`),
    byKind: group((t) => t.kind),
    byObjects: group((t) => String(t.difficulty.objects)),
    byLighting: group((t) => t.difficulty.lighting),
  };
});

// scenes every evaluated model got wrong: the failure gallery
const allWrong = tasks
  .filter((t) => files.length > 0 && files.every((f) => {
    const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { results: Row[] };
    const r = j.results.find((x) => x.id === t.id);
    return r && !r.error && !r.correct;
  }))
  .map((t) => t.id);

writeFileSync("public/bench/summary.json", JSON.stringify({ generated: new Date().toISOString(), taskCount: tasks.length, models, allWrong }, null, 2));
for (const m of models) console.log(`${m.provider}: ${(m.overall.accuracy * 100).toFixed(1)}% over ${m.overall.n} tasks`);
console.log(`wrote public/bench/summary.json (all-models-wrong scenes: ${allWrong.length})`);
