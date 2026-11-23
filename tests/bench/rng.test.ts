import { describe, expect, it } from "vitest";
import { makeRng } from "../../lib/bench/rng";

describe("rng", () => {
  it("repeats exactly for the same seed", () => {
    const a = makeRng(5), b = makeRng(5);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });
  it("differs between seeds", () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next());
  });
  it("stays within [0, 1) and within requested ranges", () => {
    const r = makeRng(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const x = r.between(-2, 3);
      expect(x).toBeGreaterThanOrEqual(-2);
      expect(x).toBeLessThan(3);
    }
  });
  it("shuffles without losing items", () => {
    const out = makeRng(3).shuffle([1, 2, 3, 4, 5]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
