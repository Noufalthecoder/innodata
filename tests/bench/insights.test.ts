import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAILURE_NOTES } from "../../lib/bench/failures";
import { missCounts, modelInsight, resultFileName, type ResultFile } from "../../lib/bench/insights";
import { MODEL_META } from "../../lib/bench/modelProfiles";
import type { Task } from "../../lib/bench/types";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const summary = read("public/bench/summary.json");
const tasks: Task[] = read("public/bench/tasks.json");
const files: ResultFile[] = summary.models.map((m: { model: string }) => read(`public/bench/results/${resultFileName(m.model)}`));
const pct = (a: { accuracy: number }) => Math.round(a.accuracy * 100);

describe("model insights are computed from the stored results", () => {
  const models: string[] = summary.models.map((m: { model: string }) => m.model);
  it.each(models)("%s matches summary.json", (model) => {
    const s = summary.models.find((m: { model: string }) => m.model === model);
    const ins = modelInsight(files.find((f) => f.model === model)!, files, tasks);
    expect(ins.overall.pct).toBe(pct(s.overall));
    for (const k of ["closer", "leftmost", "orientation", "stability"] as const) expect(ins.byKind[k].pct).toBe(pct(s.byKind[k]));
    for (const t of [1, 2, 3] as const) expect(ins.byTier[t].pct).toBe(pct(s.byTier[`tier${t}`]));
    expect(ins.light.dim.pct).toBe(pct(s.byLighting.dim));
    expect(ins.light.normal.pct).toBe(pct(s.byLighting.normal));
    // every percentage quoted in the generated text exists in the computed numbers
    const text = [ins.headline, ...ins.findings, ...ins.strengths, ...ins.weaknesses].join(" ");
    expect(text).toContain(`${ins.overall.pct}%`);
  });

  it("ranks models in the same order as the summary", () => {
    const order = files.map((f) => modelInsight(f, files, tasks)).sort((a, b) => a.rank - b.rank).map((i) => i.overall.pct);
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it("stability breakdown adds up to the stability score", () => {
    for (const f of files) {
      const i = modelInsight(f, files, tasks);
      expect(i.stability.standsRecognised + i.stability.fallsCaught).toBe(i.byKind.stability.correct);
      expect(i.stability.stands + i.stability.falls).toBe(i.byKind.stability.n);
    }
  });

  it("'missed by every model' agrees with the report", () => {
    const misses = missCounts(files);
    const all = [...misses].filter(([, n]) => n === files.length).map(([id]) => id).sort();
    expect(all).toEqual([...summary.allWrong].sort());
  });
});

describe("hand-written notes contain no results", () => {
  it("failure notes have no numbers and no model names (those come from the data)", () => {
    for (const n of Object.values(FAILURE_NOTES)) {
      const text = `${n.title} ${n.likelyCause} ${n.impact}`;
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/gemini|gemma|qwen|mistral|llama|claude|gpt/i);
    }
  });
  it("model metadata has no scores", () => {
    for (const m of Object.values(MODEL_META)) expect(`${m.kind} ${m.license} ${m.company}`).not.toMatch(/%|\d+\s*(of|\/)\s*\d+/);
  });
  it("every evaluated model has metadata", () => {
    for (const m of summary.models) expect(MODEL_META[m.model], m.model).toBeDefined();
  });
});
