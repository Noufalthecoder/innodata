// Mutation testing: deliberately break the implementation, one defect at a time, and check the test suite fails.
// A mutant that the tests catch is "killed"; one they miss "survived" and points at a gap in the tests.
// Every source file is restored after each run (and on Ctrl+C). Writes public/bench/mutation-report.json.
//
//   npm run bench:mutation             all mutants
//   npm run bench:mutation -- M3 M7    only these
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MUTANTS = [
  // independent ground-truth re-derivation
  { id: "M1", file: "lib/bench/truth.ts", what: "Depth: re-derivation picks the farthest object instead of the nearest", find: "return d.indexOf(Math.min(...d));", repl: "return d.indexOf(Math.max(...d));" },
  { id: "M2", file: "lib/bench/truth.ts", what: "Position: re-derivation picks the right-most object", find: "return xs.indexOf(Math.min(...xs));", repl: "return xs.indexOf(Math.max(...xs));" },
  { id: "M3", file: "lib/bench/truth.ts", what: "Orientation: towards / away from the camera swapped", find: "return fz > 0 ? 0 : 1;", repl: "return fz > 0 ? 1 : 0;" },
  { id: "M4", file: "lib/bench/truth.ts", what: "Orientation: left / right swapped", find: "return fx > 0 ? 3 : 2;", repl: "return fx > 0 ? 2 : 3;" },
  { id: "M5", file: "lib/bench/truth.ts", what: "Stability: support region twice as wide (too lenient)", find: "const half = boxes[i - 1].size[0] / 2;", repl: "const half = boxes[i - 1].size[0];" },
  { id: "M6", file: "lib/bench/truth.ts", what: "Stability: only the top box is checked", find: "for (let i = boxes.length - 1; i >= 1; i--)", repl: "for (let i = boxes.length - 1; i >= boxes.length - 1; i--)" },
  // task generator
  { id: "M7", file: "lib/bench/tasks.ts", what: "Generator: depth answer set to the farthest object", find: "answer = d.indexOf(sorted[0]);", repl: "answer = d.indexOf(sorted[sorted.length - 1]);" },
  { id: "M8", file: "lib/bench/tasks.ts", what: "Generator: orientation answer towards / away swapped", find: "(facing[2] > 0 ? 0 : 1)", repl: "(facing[2] > 0 ? 1 : 0)" },
  { id: "M9", file: "lib/bench/tasks.ts", what: "Generator: stable and unstable labels swapped", find: "answer: a.stable ? 0 : 1,", repl: "answer: a.stable ? 1 : 0," },
  // visibility gate
  { id: "M10", file: "lib/bench/visibility.ts", what: "Visibility: occlusion threshold disabled (0% visible passes)", find: "export const MIN_VISIBLE = 0.7;", repl: "export const MIN_VISIBLE = 0.0;" },
  { id: "M11", file: "lib/bench/visibility.ts", what: "Visibility: objects cut off by the frame still pass", find: "ok: inFrame && alone >= MIN_PIXELS", repl: "ok: alone >= MIN_PIXELS" },
  { id: "M12", file: "lib/bench/visibility.ts", what: "Visibility: minimum object size disabled", find: "export const MIN_PIXELS = 2500;", repl: "export const MIN_PIXELS = 0;" },
  // scoring of model replies
  { id: "M13", file: "lib/bench/models.ts", what: "Scoring: first stated answer wins instead of the final one", find: "return valid(stated[stated.length - 1][1]);", repl: "return valid(stated[0][1]);" },
  { id: "M14", file: "lib/bench/models.ts", what: "Scoring: letters beyond the offered options accepted", find: "return i >= 0 && i < n ? i : null;", repl: "return i >= 0 ? i : null;" },
  // statistics
  { id: "M15", file: "lib/bench/metrics.ts", what: "Statistics: 90% instead of 95% confidence interval", find: "z = 1.96", repl: "z = 1.64" },
  { id: "M16", file: "lib/bench/metrics.ts", what: "Statistics: chance adjustment not rescaled", find: "(accuracy - chance) / (1 - chance)", repl: "(accuracy - chance)" },
  { id: "M17", file: "lib/bench/metrics.ts", what: "Statistics: McNemar test one-sided instead of two-sided", find: "return Math.min(1, 2 * tail);", repl: "return Math.min(1, tail);" },
];

const only = process.argv.slice(2);
const todo = only.length ? MUTANTS.filter((m) => only.includes(m.id)) : MUTANTS;

// refuse to start on uncommitted changes to a target file, so a restore can never lose work
const files = [...new Set(todo.map((m) => m.file))];
// (skipped where git is unavailable, e.g. inside the Docker image; files are restored after every mutant either way)
const git = spawnSync("git", ["status", "--porcelain", "--", ...files], { encoding: "utf8" });
const dirty = git.status === 0 ? git.stdout.trim() : "";
if (dirty) {
  console.error("Commit or stash these first:\n" + dirty);
  process.exit(1);
}

const originals = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const restoreAll = () => originals.forEach((src, f) => writeFileSync(f, src));
process.on("SIGINT", () => { restoreAll(); process.exit(130); });

const vitest = process.platform === "win32" ? "npx.cmd" : "npx";
const results = [];
for (const m of todo) {
  const src = originals.get(m.file);
  if (src.split(m.find).length !== 2) {
    restoreAll();
    throw new Error(`${m.id}: pattern must occur exactly once in ${m.file}: ${m.find}`);
  }
  writeFileSync(m.file, src.replace(m.find, m.repl));
  const t0 = Date.now();
  let r;
  try {
    r = spawnSync(vitest, ["vitest", "run", "--bail", "1", "--reporter", "dot"], { encoding: "utf8", shell: process.platform === "win32" });
  } finally {
    writeFileSync(m.file, src);
  }
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  // the first failing test, as evidence of what caught the defect
  const caughtBy = (out.match(/FAIL\s+(tests\/\S+ > [^\n]+)/) ?? [])[1]?.trim() ?? null;
  const killed = r.status !== 0;
  results.push({ id: m.id, file: m.file, defect: m.what, killed, caughtBy, seconds: Math.round((Date.now() - t0) / 1000) });
  console.log(`${m.id.padEnd(4)} ${killed ? "KILLED  " : "SURVIVED"} ${m.what}${caughtBy ? `\n       caught by: ${caughtBy}` : ""}`);
}
restoreAll();

const killed = results.filter((r) => r.killed).length;
const report = { ranAt: new Date().toISOString(), total: results.length, killed, score: killed / results.length, mutants: results };
if (!only.length) writeFileSync("public/bench/mutation-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(`\nmutation score: ${killed}/${results.length} killed`);
process.exit(killed === results.length ? 0 : 2);
