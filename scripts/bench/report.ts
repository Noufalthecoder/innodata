// npm run bench:report
// Aggregates results/*.json into public/bench/summary.json (accuracy by model, tier, kind and difficulty).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { cell, chanceAdjusted, choiceDistribution, mcnemarExact, pickBest } from "../../lib/bench/metrics";
import type { Task } from "../../lib/bench/types";

type Row = { id: string; choice: number | null; correct: boolean; error?: string };

const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
const byId = new Map(tasks.map((t) => [t.id, t]));
const dir = "public/bench/results";
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

const acc = (rows: Row[]) => ({ n: rows.length, correct: rows.filter((r) => r.correct).length, accuracy: rows.length ? rows.filter((r) => r.correct).length / rows.length : 0 });

// only report models that answered every task; partial runs (e.g. a daily quota hit) are skipped, not shown as a score
const complete = files.filter((f) => {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { model: string; results: Row[] };
  const answered = new Set(j.results.filter((r) => !r.error).map((r) => r.id));
  const ok = tasks.every((t) => answered.has(t.id));
  if (!ok) console.log(`skipped ${j.model}: answered ${answered.size}/${tasks.length} (incomplete; rerun bench:eval to resume)`);
  return ok;
});

const models = complete.map((f) => {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { provider: string; model: string; results: Row[] };
  const rows = j.results.filter((r) => !r.error);
  const group = (key: (t: Task) => string) => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) (g[key(byId.get(r.id)!)] ??= []).push(r);
    return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { ...acc(v), ci: cell(v).ci }]));
  };
  const byKind = group((t) => t.kind);
  const kindAcc = Object.values(byKind).map((k) => k.accuracy);
  const chance = rows.reduce((s, r) => s + 1 / byId.get(r.id)!.options.length, 0) / rows.length;
  const overall = cell(rows);
  return {
    // headline numbers beyond raw accuracy
    ci95: overall.ci,
    chance,
    chanceAdjusted: chanceAdjusted(overall.accuracy, chance),
    macroKindAccuracy: kindAcc.reduce((a, b) => a + b, 0) / kindAcc.length, // each skill weighted equally
    worstKindAccuracy: Math.min(...kindAcc),
    unparsed: rows.filter((r) => r.choice === null).length,
    choiceDistribution: choiceDistribution(rows, 4),
    truthDistribution: choiceDistribution(rows.map((r) => ({ correct: true, choice: byId.get(r.id)!.answer })), 4),
    rows,
    provider: j.provider,
    model: j.model,
    overall: acc(rows),
    errors: j.results.length - rows.length,
    byTier: group((t) => `tier${t.tier}`),
    byKind,
    byObjects: group((t) => String(t.difficulty.objects)),
    byLighting: group((t) => t.difficulty.lighting),
  };
});

// best model per category, with statistical ties called out (n is small, so a 1-task lead is not a win)
const categories: Record<string, (t: Task) => string> = { tier: (t) => `tier${t.tier}`, kind: (t) => t.kind, objects: (t) => String(t.difficulty.objects), lighting: (t) => t.difficulty.lighting };
const best: Record<string, Record<string, ReturnType<typeof pickBest>>> = { overall: { all: pickBest(models.map((m) => ({ model: m.model, cell: cell(m.rows) }))) } };
for (const [name, key] of Object.entries(categories)) {
  best[name] = {};
  for (const v of new Set(tasks.map(key))) {
    best[name][v] = pickBest(models.map((m) => ({ model: m.model, cell: cell(m.rows.filter((r) => key(byId.get(r.id)!) === v)) })));
  }
}
best.macroKind = { all: pickBest(models.map((m) => ({ model: m.model, cell: { ...cell(m.rows), accuracy: m.macroKindAccuracy } }))) };

// paired significance of every model against the overall leader (same tasks, so McNemar)
const leader = models.slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy)[0];
const vsLeader = leader
  ? models.filter((m) => m !== leader).map((m) => {
      const lead = new Map(leader.rows.map((r) => [r.id, r.correct]));
      let onlyLeader = 0, onlyOther = 0;
      for (const r of m.rows) { const l = lead.get(r.id); if (l && !r.correct) onlyLeader++; if (!l && r.correct) onlyOther++; }
      return { model: m.model, leader: leader.model, onlyLeaderCorrect: onlyLeader, onlyThisCorrect: onlyOther, pValue: mcnemarExact(onlyLeader, onlyOther) };
    })
  : [];

// scenes every evaluated model got wrong: the failure gallery
const allWrong = tasks
  .filter((t) => complete.length > 0 && complete.every((f) => {
    const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { results: Row[] };
    const r = j.results.find((x) => x.id === t.id);
    return r && !r.error && !r.correct;
  }))
  .map((t) => t.id);

writeFileSync("public/bench/summary.json", JSON.stringify({ generated: new Date().toISOString(), taskCount: tasks.length, models: models.map(({ rows, ...m }) => m), best, vsLeader, allWrong }, null, 2));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
for (const m of models) console.log(`${m.model}: ${pct(m.overall.accuracy)} [${pct(m.ci95.low)}-${pct(m.ci95.high)}] chance-adj ${pct(m.chanceAdjusted)} macro-skill ${pct(m.macroKindAccuracy)} worst-skill ${pct(m.worstKindAccuracy)} unparsed ${m.unparsed}`);
for (const [cat, vals] of Object.entries(best)) for (const [v, b] of Object.entries(vals)) console.log(`best ${cat}/${v}: ${b.leader.join(" = ")} (${pct(b.accuracy)})${b.tied.length ? `, not significantly behind: ${b.tied.join(", ")}` : ""}`);
for (const v of vsLeader) console.log(`${v.model} vs ${v.leader}: p=${v.pValue.toFixed(3)} (${v.onlyLeaderCorrect} vs ${v.onlyThisCorrect} discordant)`);
console.log(`wrote public/bench/summary.json (all-models-wrong scenes: ${allWrong.length})`);
