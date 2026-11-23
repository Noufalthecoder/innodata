import { describe, expect, it } from "vitest";
import { generateTask, KIND_TIER } from "../../lib/bench/tasks";
import { deriveAnswer } from "../../lib/bench/truth";
import type { Kind } from "../../lib/bench/types";

const KINDS: Kind[] = ["closer", "leftmost", "orientation", "stability"];

describe("task generation", () => {
  for (const kind of KINDS) {
    describe(kind, () => {
      it("is deterministic: the same seed rebuilds the same task", async () => {
        const a = await generateTask({ kind, seed: 11 });
        const b = await generateTask({ kind, seed: 11 });
        expect(b.task.objects).toEqual(a.task.objects);
        expect(b.task.answer).toBe(a.task.answer);
        expect(b.task.question).toBe(a.task.question);
        expect(b.task.render).toEqual(a.task.render);
      });

      it("different seeds give different scenes", async () => {
        const a = await generateTask({ kind, seed: 21 });
        const b = await generateTask({ kind, seed: 22 });
        expect(JSON.stringify(a.task.objects)).not.toBe(JSON.stringify(b.task.objects));
      });

      it("ground truth matches the independent re-derivation across seeds", async () => {
        for (const seed of [31, 32, 33, 34, 35]) {
          const { task } = await generateTask({ kind, seed });
          expect(deriveAnswer(task)).toBe(task.answer);
        }
      });

      it("keeps the answer in range and every visibility check passing", async () => {
        const { task } = await generateTask({ kind, seed: 41 });
        expect(task.answer).toBeGreaterThanOrEqual(0);
        expect(task.answer).toBeLessThan(task.options.length);
        expect(task.visibility.length).toBeGreaterThan(0);
        expect(task.visibility.every((v) => v.ok)).toBe(true);
        expect(task.tier).toBe(KIND_TIER[kind]);
      });

      it("renders a real JPEG", async () => {
        const { jpeg } = await generateTask({ kind, seed: 51 });
        expect(jpeg.length).toBeGreaterThan(5000);
        expect(jpeg[0]).toBe(0xff);
        expect(jpeg[1]).toBe(0xd8);
      });
    });
  }

  it("honours the requested object count and makes relative options unique", async () => {
    for (const n of [2, 3, 4, 5]) {
      const { task } = await generateTask({ kind: "closer", seed: 60 + n, objects: n });
      expect(task.objects).toHaveLength(n);
      expect(new Set(task.options).size).toBe(n);
    }
  });

  it("varies the options with the scene (not a fixed answer position)", async () => {
    const answers = new Set<number>();
    for (let s = 70; s < 85; s++) answers.add((await generateTask({ kind: "closer", seed: s, objects: 3 })).task.answer);
    expect(answers.size).toBeGreaterThan(1);
  });

  it("applies dim lighting when asked", async () => {
    const { task } = await generateTask({ kind: "closer", seed: 90, lighting: "dim" });
    expect(task.difficulty.lighting).toBe("dim");
  });

  it("lets the caller force a stability outcome, and the answer follows it", async () => {
    for (const seed of [100, 101, 102, 103]) {
      const stands = await generateTask({ kind: "stability", seed, objects: 3, stable: true });
      const falls = await generateTask({ kind: "stability", seed, objects: 3, stable: false });
      expect(stands.task.answer).toBe(0);
      expect(falls.task.answer).toBe(1);
      expect(stands.task.gen).toEqual({ stable: true });
    }
  });

  it("does not give sequential seeds correlated stability outcomes by default", async () => {
    const answers: number[] = [];
    for (let s = 200; s < 224; s++) answers.push((await generateTask({ kind: "stability", seed: s, objects: 2 })).task.answer);
    const falls = answers.filter((a) => a === 1).length;
    expect(falls).toBeGreaterThan(4);
    expect(falls).toBeLessThan(20);
  });
});
