import { describe, expect, it } from "vitest";
import { makeRng } from "../../lib/bench/rng";
import { stackAnalysis, STACK_BOX } from "../../lib/bench/tasks";
import { deriveAnswer } from "../../lib/bench/truth";
import { box, makeTask } from "./helpers";

describe("stability rule cross-check", () => {
  it("the generator's rule and the independent re-derivation agree on 500 random stacks", () => {
    const rng = makeRng(2026);
    let stable = 0;
    for (let i = 0; i < 500; i++) {
      const n = 2 + Math.floor(rng.next() * 3);
      const xs = [0];
      for (let k = 1; k < n; k++) xs.push(xs[k - 1] + rng.between(-1, 1));
      const viaGenerator = stackAnalysis(xs, STACK_BOX[0]).stable;
      const task = makeTask({ kind: "stability", objects: xs.map((x, k) => box(k, [x, 0.5 + k, 0], STACK_BOX)), options: ["stands", "falls"] });
      expect(deriveAnswer(task) === 0).toBe(viaGenerator);
      if (viaGenerator) stable++;
    }
    // both outcomes must actually occur, otherwise the test proves nothing
    expect(stable).toBeGreaterThan(50);
    expect(stable).toBeLessThan(450);
  });

  it("reports the margin of every level", () => {
    const a = stackAnalysis([0, 0.3, 0.3], 1.5);
    expect(a.checks).toHaveLength(2);
    expect(a.checks.every((c) => Number.isFinite(c.margin))).toBe(true);
  });
});
