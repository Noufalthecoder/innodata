import { describe, expect, it } from "vitest";
import { buildPrompt, parseChoice } from "../../lib/bench/models";
import { generateTask } from "../../lib/bench/tasks";

describe("parseChoice", () => {
  it.each([
    ["B", 3, 1],
    ["b", 3, 1],
    ["B.", 3, 1],
    ["(C)", 3, 2],
    ["A. The red box", 3, 0],
    ["Answer: D", 4, 3],
    ["The answer is C", 3, 2],
    ["  A\n", 2, 0],
    ["1. Look at the stack.\n2. Options: A. It stays standing, B. It falls\nThe correct option is B.B", 2, 1],
    ["A. The violet cone\nB. The amber cone\nThe correct option is A.", 2, 0],
    ["Reasoning about depth... so the answer is **C**", 3, 2],
  ])("reads %j", (raw, n, expected) => {
    expect(parseChoice(raw, n)).toBe(expected);
  });

  it.each([
    ["", 3],
    ["I cannot tell from this image", 3],
    ["M", 2],
    ["C", 2], // out of range for two options
    ["Either A or B could be right", 2], // ambiguous
  ])("rejects %j instead of guessing", (raw, n) => {
    expect(parseChoice(raw, n)).toBeNull();
  });

  it("does not mistake the article 'a' for option A", () => {
    expect(parseChoice("It is a clear case, but B is closest", 3)).toBe(1);
  });

  // added after mutation testing (M13) showed no test pinned this down
  it("takes the final stated answer when a model changes its mind", () => {
    expect(parseChoice("At first glance the answer is A. Looking again at the shadows, the answer is C.", 3)).toBe(2);
    expect(parseChoice("Option: B seems likely... but on reflection the correct option is D", 4)).toBe(3);
  });
});

describe("prompt", () => {
  it("lists every option with its letter", () => {
    const p = buildPrompt("Which is closest?", ["The red box", "The blue cone", "The grey sphere"]);
    expect(p).toContain("Which is closest?");
    expect(p).toContain("A. The red box");
    expect(p).toContain("B. The blue cone");
    expect(p).toContain("C. The grey sphere");
    expect(p).not.toContain("D.");
  });

  it("never leaks the ground truth", async () => {
    for (const kind of ["closer", "leftmost", "orientation", "stability"] as const) {
      const { task } = await generateTask({ kind, seed: 7 });
      const p = buildPrompt(task.question, task.options);
      expect(p).not.toContain(task.explanation);
      expect(p.toLowerCase()).not.toContain("ground truth");
      expect(p.toLowerCase()).not.toContain(task.options[task.answer].toLowerCase() + " (correct");
      expect(p).not.toMatch(/\d+\.\d{2} m/); // no computed distances
    }
  });
});
