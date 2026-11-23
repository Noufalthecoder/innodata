import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateTask, KIND_TIER } from "../../lib/bench/tasks";
import { HDRIS, FLOORS, MATERIALS } from "../../lib/bench/style";
import { deriveAnswer } from "../../lib/bench/truth";
import type { Task } from "../../lib/bench/types";

const FILE = "public/bench/tasks.json";
const tasks: Task[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];

describe.skipIf(tasks.length === 0)("shipped dataset (public/bench/tasks.json)", () => {
  it("has unique ids and seeds", () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    expect(new Set(tasks.map((t) => t.seed)).size).toBe(tasks.length);
  });

  it("every stored answer is re-derived exactly by independent code", () => {
    const bad = tasks.filter((t) => deriveAnswer(t) !== t.answer).map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it("every task passed the visibility check", () => {
    const bad = tasks.filter((t) => t.visibility.length === 0 || !t.visibility.every((v) => v.ok)).map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it("is structurally valid", () => {
    for (const t of tasks) {
      expect(t.options.length).toBeGreaterThanOrEqual(2);
      expect(t.answer).toBeGreaterThanOrEqual(0);
      expect(t.answer).toBeLessThan(t.options.length);
      expect(t.tier).toBe(KIND_TIER[t.kind]);
      expect(t.image).toMatch(/^\/bench\/images\/.+\.jpg$/);
      expect(existsSync(`public${t.image}`)).toBe(true);
    }
  });

  it("covers all three tiers and varies difficulty", () => {
    expect(new Set(tasks.map((t) => t.tier))).toEqual(new Set([1, 2, 3]));
    expect(new Set(tasks.map((t) => t.difficulty.objects)).size).toBeGreaterThan(2);
    expect(new Set(tasks.map((t) => t.difficulty.lighting))).toEqual(new Set(["normal", "dim"]));
  });

  it("is not biased toward one answer position", () => {
    const relative = tasks.filter((t) => t.kind === "closer" || t.kind === "leftmost");
    const counts = new Map<number, number>();
    for (const t of relative) counts.set(t.answer, (counts.get(t.answer) ?? 0) + 1);
    const max = Math.max(...counts.values());
    expect(max / relative.length).toBeLessThan(0.6);
  });

  it("balances stability tasks so a constant answer cannot score well", () => {
    const st = tasks.filter((t) => t.kind === "stability");
    const stands = st.filter((t) => t.answer === 0).length;
    expect(st.length).toBeGreaterThan(0);
    expect(stands / st.length).toBeGreaterThanOrEqual(0.4);
    expect(stands / st.length).toBeLessThanOrEqual(0.6);
  });

  it("uses only known render styles", () => {
    for (const t of tasks) {
      if (!t.render) continue;
      expect(HDRIS).toContain(t.render.hdri);
      expect(FLOORS).toContain(t.render.floor);
      expect(MATERIALS).toContain(t.render.material);
    }
  });

  it("rebuilds a sample of tasks identically from their seeds", async () => {
    const sample = tasks.filter((_, i) => i % 10 === 0);
    for (const t of sample) {
      const { task } = await generateTask({ kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting, stable: t.gen?.stable });
      expect(task.objects).toEqual(t.objects);
      expect(task.answer).toBe(t.answer);
    }
  });
});

describe.skipIf(tasks.length === 0)("validators catch wrong ground truth (mutation test)", () => {
  it("flagging every deliberately corrupted answer", () => {
    for (const t of tasks) {
      const corrupted = { ...t, answer: (t.answer + 1) % t.options.length };
      expect(deriveAnswer(corrupted)).not.toBe(corrupted.answer);
    }
  });

  it("flagging tasks whose scene was altered after the answer was computed", () => {
    let detected = 0;
    let considered = 0;
    for (const t of tasks.filter((x) => x.kind === "closer" && x.options.length >= 2)) {
      // swap the first two objects' positions: the answer should now refer to the other object
      const objs = t.objects.map((o) => ({ ...o }));
      const c0 = objs[0].center, c1 = objs[1].center;
      objs[0].center = c1;
      objs[1].center = c0;
      considered++;
      if (deriveAnswer({ ...t, objects: objs }) !== t.answer) detected++;
    }
    expect(considered).toBeGreaterThan(0);
    expect(detected).toBeGreaterThan(0);
  });
});
