import { describe, expect, it } from "vitest";
import { cell, chanceAdjusted, choiceDistribution, mcnemarExact, pickBest, wilson } from "../../lib/bench/metrics";

describe("metrics", () => {
  it("wilson interval brackets the estimate and is wide for small n", () => {
    const w = wilson(8, 10);
    expect(w.low).toBeCloseTo(0.4902, 3);
    expect(w.high).toBeCloseTo(0.9433, 3);
    expect(wilson(60, 60).high).toBeCloseTo(1, 10);
    expect(wilson(0, 0)).toEqual({ low: 0, high: 0 });
  });
  it("chance-adjusted maps guessing to 0 and perfect to 1", () => {
    expect(chanceAdjusted(0.25, 0.25)).toBe(0);
    expect(chanceAdjusted(1, 0.25)).toBe(1);
    expect(chanceAdjusted(0.1, 0.25)).toBeLessThan(0);
  });
  it("mcnemar exact matches known values", () => {
    expect(mcnemarExact(0, 0)).toBe(1);
    expect(mcnemarExact(5, 5)).toBe(1);
    expect(mcnemarExact(0, 8)).toBeCloseTo(0.0078125, 6);
    expect(mcnemarExact(1, 9)).toBeCloseTo(0.021484, 5);
  });
  it("choice distribution ignores unparsed replies", () => {
    const d = choiceDistribution([{ correct: true, choice: 0 }, { correct: false, choice: 0 }, { correct: false, choice: null }, { correct: true, choice: 2 }], 4);
    expect(d).toEqual([2 / 3, 0, 1 / 3, 0]);
  });
  it("pickBest flags overlapping intervals as tied", () => {
    const a = cell(Array.from({ length: 10 }, (_, i) => ({ correct: i < 9, choice: 0 })));
    const b = cell(Array.from({ length: 10 }, (_, i) => ({ correct: i < 8, choice: 0 })));
    const c = cell(Array.from({ length: 10 }, (_, i) => ({ correct: i < 2, choice: 0 })));
    const best = pickBest([{ model: "a", cell: a }, { model: "b", cell: b }, { model: "c", cell: c }]);
    expect(best.leader).toEqual(["a"]);
    expect(best.tied).toEqual(["b"]);
  });
});
