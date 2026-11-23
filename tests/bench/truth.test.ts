import { describe, expect, it } from "vitest";
import { deriveAnswer } from "../../lib/bench/truth";
import { containerParts } from "../../lib/bench/tasks";
import { box, makeTask, sphere } from "./helpers";

describe("ground truth: closest to camera", () => {
  it("picks the object with the smallest camera distance", () => {
    const near = box(0, [0, 0.5, 2]);
    const far = box(1, [0, 0.5, -3]);
    expect(deriveAnswer(makeTask({ kind: "closer", objects: [near, far] }))).toBe(0);
    expect(deriveAnswer(makeTask({ kind: "closer", objects: [far, near] }))).toBe(1);
  });

  it("uses true 3D distance, not just depth", () => {
    // B is a little further in z but directly in front; A is shallower in z yet far off to the side
    const a = box(0, [6, 0.5, 1]);
    const b = box(1, [0, 0.5, 0]);
    expect(deriveAnswer(makeTask({ kind: "closer", objects: [a, b] }))).toBe(1);
  });
});

describe("ground truth: left-most in the image", () => {
  it("picks the object with the smallest projected x", () => {
    const left = sphere(0, [-2, 0.45, 0]);
    const right = sphere(1, [2, 0.45, 0]);
    expect(deriveAnswer(makeTask({ kind: "leftmost", objects: [right, left] }))).toBe(1);
    expect(deriveAnswer(makeTask({ kind: "leftmost", objects: [left, right] }))).toBe(0);
  });

  it("accounts for perspective: a far-left object can sit right of a near-left one", () => {
    const nearLeft = sphere(0, [-1.5, 0.45, 3]);
    const farLeft = sphere(1, [-1.5, 0.45, -8]);
    // same world x, but the nearer one projects further from the image centre
    expect(deriveAnswer(makeTask({ kind: "leftmost", objects: [nearLeft, farLeft] }))).toBe(0);
  });
});

describe("ground truth: container orientation", () => {
  const OPTIONS = ["toward", "away", "left", "right"];
  const answerFor = (rot: number) => deriveAnswer(makeTask({ kind: "orientation", objects: containerParts(0, rot), options: OPTIONS }));

  it("open side at yaw 0 faces the camera", () => expect(answerFor(0)).toBe(0));
  it("yaw 180 degrees faces away", () => expect(answerFor(Math.PI)).toBe(1));
  it("yaw +90 degrees faces image-right", () => expect(answerFor(Math.PI / 2)).toBe(3));
  it("yaw -90 degrees faces image-left", () => expect(answerFor(-Math.PI / 2)).toBe(2));
  it("tolerates small jitter around each direction", () => {
    for (const d of [-0.3, 0, 0.3]) {
      expect(answerFor(d)).toBe(0);
      expect(answerFor(Math.PI + d)).toBe(1);
    }
  });
});

describe("ground truth: stack stability", () => {
  const stack = (xs: number[]) =>
    makeTask({ kind: "stability", objects: xs.map((x, i) => box(i, [x, 0.5 + i, 0], [1.5, 1, 1.5])), options: ["stands", "falls"] });

  it("a straight stack stands", () => expect(deriveAnswer(stack([0, 0, 0]))).toBe(0));
  it("a small offset stands", () => expect(deriveAnswer(stack([0, 0.2]))).toBe(0));
  it("a large overhang falls", () => expect(deriveAnswer(stack([0, 1.0]))).toBe(1));
  it("falls when the upper boxes together overhang even if the top box alone is fine", () => {
    // top over middle is ok (0.3 offset) but middle+top com (0.9) is outside the bottom box (spans -0.75..0.75)
    expect(deriveAnswer(stack([0, 0.75 + 0.2, 0.75 + 0.2 + 0.3]))).toBe(1);
  });
  it("is independent of the order objects are listed in", () => {
    const t = stack([0, 0.1, 1.2]);
    const shuffled = { ...t, objects: [t.objects[2], t.objects[0], t.objects[1]] };
    expect(deriveAnswer(shuffled)).toBe(deriveAnswer(t));
  });
});
