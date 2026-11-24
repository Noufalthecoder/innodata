/**
 * Every number shown about a model is computed here from the stored results, never typed by hand.
 * Pure functions: used by the app and checked by tests/bench/insights.test.ts against summary.json.
 */
import type { Kind, Task } from "./types";

export type ResultRow = { id: string; raw: string; choice: number | null; correct: boolean; error?: string };
export type ResultFile = { provider: string; model: string; ran: string; results: ResultRow[] };

/** results/<file>.json for a model id (same rule as scripts/bench/eval.ts) */
export const resultFileName = (model: string) => `${model.replace(/[^a-z0-9._-]/gi, "_")}.json`;

const KIND_NAME: Record<Kind, string> = { closer: "Depth (closest object)", leftmost: "Position (left-most)", orientation: "Orientation", stability: "Stability" };
const KIND_SHORT: Record<Kind, string> = { closer: "depth", leftmost: "left-right position", orientation: "orientation", stability: "stability" };
const CHANCE: Record<Kind, string> = { closer: "25–50%", leftmost: "25–50%", orientation: "25%", stability: "50%" };
const pct = (a: number, n: number) => (n ? Math.round((a / n) * 100) : 0);

export type Rate = { correct: number; n: number; pct: number };
const rate = (rows: { correct: boolean }[]): Rate => {
  const c = rows.filter((r) => r.correct).length;
  return { correct: c, n: rows.length, pct: pct(c, rows.length) };
};

export type ModelInsight = {
  model: string;
  overall: Rate;
  rank: number;
  of: number;
  byKind: Record<Kind, Rate>;
  byTier: Record<1 | 2 | 3, Rate>;
  light: { normal: Rate; dim: Rate };
  stability: { standsRecognised: number; stands: number; fallsCaught: number; falls: number };
  /** how often each orientation option was chosen, and the most chosen one */
  orientation: { picks: { option: string; count: number }[]; truth: { option: string; count: number }[]; top?: { option: string; count: number } };
  headline: string;
  findings: string[];
  strengths: string[];
  weaknesses: string[];
};

/** answered rows only: API errors are excluded from accuracy, as in the report */
function scored(file: ResultFile, tasks: Map<string, Task>) {
  return file.results.filter((r) => !r.error && tasks.has(r.id)).map((r) => ({ ...r, task: tasks.get(r.id)! }));
}

export function modelInsight(file: ResultFile, allFiles: ResultFile[], taskList: Task[]): ModelInsight {
  const tasks = new Map(taskList.map((t) => [t.id, t]));
  const rows = scored(file, tasks);
  const of = (k: Kind) => rows.filter((r) => r.task.kind === k);
  const byKind = { closer: rate(of("closer")), leftmost: rate(of("leftmost")), orientation: rate(of("orientation")), stability: rate(of("stability")) };
  const byTier = { 1: rate(rows.filter((r) => r.task.tier === 1)), 2: rate(rows.filter((r) => r.task.tier === 2)), 3: rate(rows.filter((r) => r.task.tier === 3)) };
  const light = { normal: rate(rows.filter((r) => r.task.difficulty.lighting === "normal")), dim: rate(rows.filter((r) => r.task.difficulty.lighting === "dim")) };
  const overall = rate(rows);

  const ranked = allFiles.map((f) => ({ model: f.model, p: rate(scored(f, tasks)).correct / Math.max(1, scored(f, tasks).length) })).sort((a, b) => b.p - a.p);
  const rank = ranked.findIndex((r) => r.p <= overall.correct / Math.max(1, overall.n) + 1e-9) + 1;

  const st = of("stability");
  const standRows = st.filter((r) => r.task.answer === 0);
  const fallRows = st.filter((r) => r.task.answer === 1);
  const stability = { standsRecognised: standRows.filter((r) => r.correct).length, stands: standRows.length, fallsCaught: fallRows.filter((r) => r.correct).length, falls: fallRows.length };

  const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).map(([option, count]) => ({ option, count })).sort((a, b) => b.count - a.count);
  const ori = of("orientation");
  const picks = count(ori.map((r) => (r.choice === null ? "no answer" : r.task.options[r.choice])));
  const truth = count(ori.map((r) => r.task.options[r.task.answer]));
  const orientation = { picks, truth, top: picks[0] };

  // ---------- findings: each sentence is built from the numbers above ----------
  const findings: string[] = [];
  const t2 = byTier[2];
  findings.push(`Depth & position: ${t2.correct} of ${t2.n} correct (${t2.pct}%) · closest ${byKind.closer.pct}%, left-most ${byKind.leftmost.pct}%.`);
  if (orientation.top)
    findings.push(
      `Orientation: ${byKind.orientation.pct}% against 25% for guessing. Most common answer “${orientation.top.option.toLowerCase()}” (${orientation.top.count} of ${ori.length}); the truth is spread over ${truth.length} directions.`,
    );
  findings.push(`Stability: recognised ${stability.standsRecognised} of ${stability.stands} stable stacks and caught ${stability.fallsCaught} of ${stability.falls} unstable ones (${byKind.stability.pct}%).`);
  findings.push(`Light: ${light.normal.pct}% in normal light, ${light.dim.pct}% in dim light (${light.dim.n} tasks).`);

  // ---------- strengths and weaknesses: thresholds, not opinions ----------
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const k of Object.keys(byKind) as Kind[]) {
    const r = byKind[k];
    if (r.n && r.pct >= 90) strengths.push(`${KIND_NAME[k]}: ${r.pct}%`);
    else if (r.n && r.pct <= 50) weaknesses.push(`${KIND_NAME[k]}: ${r.pct}% (chance ${CHANCE[k]})`);
  }
  if (stability.stands && stability.standsRecognised === stability.stands && stability.fallsCaught >= stability.falls - 2) strengths.push("No collapse bias: every stable stack recognised");
  if (stability.stands && stability.fallsCaught - stability.standsRecognised >= 3) weaknesses.push(`Collapse bias: calls ${stability.stands - stability.standsRecognised} of ${stability.stands} stable stacks unsafe`);
  if (orientation.top && orientation.top.count >= Math.ceil(ori.length * 0.7)) weaknesses.push(`Answer collapse: “${orientation.top.option.toLowerCase()}” ${orientation.top.count} of ${ori.length} times`);
  if (light.dim.n && light.normal.n && light.dim.pct >= light.normal.pct) strengths.push("No drop in dim light");

  const best = (Object.keys(byKind) as Kind[]).filter((k) => byKind[k].n).sort((a, b) => byKind[b].pct - byKind[a].pct);
  const headline = `Ranked ${rank} of ${allFiles.length} at ${overall.pct}% (${overall.correct}/${overall.n}). Strongest on ${KIND_SHORT[best[0]]} (${byKind[best[0]].pct}%), weakest on ${KIND_SHORT[best[best.length - 1]]} (${byKind[best[best.length - 1]].pct}%).`;

  return { model: file.model, overall, rank, of: allFiles.length, byKind, byTier, light, stability, orientation, headline, findings, strengths, weaknesses };
}

/** what every model answered on one task */
export function taskVerdicts(taskId: string, files: ResultFile[], taskList: Task[]) {
  const task = taskList.find((t) => t.id === taskId);
  if (!task) return [];
  return files.map((f) => {
    const r = f.results.find((x) => x.id === taskId && !x.error);
    return { model: f.model, answered: Boolean(r), correct: Boolean(r?.correct), answer: r ? (r.choice === null ? "no answer" : task.options[r.choice]) : "not run" };
  });
}

/** how many of the models got each task wrong */
export function missCounts(files: ResultFile[]) {
  const m = new Map<string, number>();
  for (const f of files) for (const r of f.results) if (!r.error && !r.correct) m.set(r.id, (m.get(r.id) ?? 0) + 1);
  return m;
}
