// npm run bench:generate -- --count 60 --seed 1 [--renderer blender|svg] [--samples 64]
// Builds task layouts + ground truth in TypeScript, then renders them.
//   blender: path-traced photoreal images (Blender Cycles) and EXACT visibility from object-mask renders (default)
//   svg:     fast preview renderer (no Blender needed)
// Writes public/bench/tasks.json and public/bench/images/*.jpg
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { generateTask } from "../../lib/bench/tasks";
import { objectName } from "../../lib/bench/geometry";
import type { Kind, Task, Visibility } from "../../lib/bench/types";
import { MIN_PIXELS, MIN_VISIBLE } from "../../lib/bench/visibility";
import { arg, loadEnv } from "./env";

type BlenderVis = { id: number; alonePixels: number; seenPixels: number; inFrame: boolean };
type BlenderResult = { id: string; ok: boolean; error?: string; visibility?: BlenderVis[] };

function runBlender(blender: string, ids: string[], samples: string) {
  const r = spawnSync(
    blender,
    ["-b", "--python", "scripts/blender/render.py", "--", "--tasks", "public/bench/tasks.json", "--out", "public/bench/images", "--assets", "assets/polyhaven", "--result", "public/bench/render-result.json", "--ids", ids.join(","), "--samples", samples],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
  if (r.error) throw r.error;
  return JSON.parse(readFileSync("public/bench/render-result.json", "utf8")) as BlenderResult[];
}

/** Turns Blender's exact pixel counts into the pipeline's visibility report. */
function exactVisibility(task: Task, vis: BlenderVis[]): Visibility[] {
  return vis.map((v) => {
    const obj = task.objects.find((o) => o.id === v.id)!;
    const ratio = v.alonePixels ? v.seenPixels / v.alonePixels : 0;
    return { object: objectName(obj), visiblePct: Math.round(ratio * 100), inFrame: v.inFrame, pixels: v.alonePixels, ok: v.inFrame && v.alonePixels >= MIN_PIXELS && ratio >= MIN_VISIBLE };
  });
}

async function main() {
  loadEnv();
  const count = Number(arg("count", "60"));
  const seed0 = Number(arg("seed", "1"));
  const renderer = arg("renderer", "blender");
  const samples = arg("samples", "40")!;
  const blender = process.env.BLENDER_PATH;
  if (renderer === "blender" && (!blender || !existsSync(blender))) throw new Error("Blender not found. Set BLENDER_PATH in .env.local, or use --renderer svg");

  mkdirSync("public/bench/images", { recursive: true });
  // previously rendered tasks are reused when their scene is unchanged (rendering is the slow part)
  const old: Task[] = existsSync("public/bench/tasks.json") && renderer === "blender" ? JSON.parse(readFileSync("public/bench/tasks.json", "utf8")) : [];
  const oldById = new Map(old.map((t) => [t.id, t]));

  // balanced mix across the three tiers, cycling difficulty (object count and lighting)
  const plan: { kind: Kind; objects?: number; lighting: "normal" | "dim"; stable?: boolean }[] = [];
  let stabilityCount = 0;
  const kinds: Kind[] = ["closer", "leftmost", "orientation", "stability", "closer", "stability"];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const objects = kind === "closer" || kind === "leftmost" ? 2 + (Math.floor(i / kinds.length) % 4) : kind === "stability" ? 2 + (Math.floor(i / kinds.length) % 3) : undefined;
    // alternate stands / falls so the stability tasks are balanced and a constant answer scores 50%
    plan.push({ kind, objects, lighting: i % 5 === 4 ? "dim" : "normal", stable: kind === "stability" ? stabilityCount++ % 2 === 0 : undefined });
  }

  // 1. layouts + ground truth (deterministic from seed)
  const tasks: Task[] = [];
  const jpegs = new Map<string, Buffer>();
  for (const [i, p] of plan.entries()) {
    const { task, jpeg } = await generateTask({ kind: p.kind, seed: seed0 + i, objects: p.objects, lighting: p.lighting, stable: p.stable });
    task.image = `/bench/images/${task.id}.jpg`;
    const prev = oldById.get(task.id);
    const same = (a: Task, b: Task) => JSON.stringify([a.objects, a.camera, a.render, a.difficulty, a.kind]) === JSON.stringify([b.objects, b.camera, b.render, b.difficulty, b.kind]);
    if (prev && same(prev, task) && prev.visibility.length && prev.visibility.every((v) => v.ok) && existsSync(`public/bench/images/${task.id}.jpg`)) task.visibility = prev.visibility;
    else task.visibility = [];
    tasks.push(task);
    jpegs.set(task.id, jpeg);
    process.stdout.write(`\rlayouts ${i + 1}/${count}`);
  }
  console.log();

  if (renderer === "svg") {
    for (const t of tasks) writeFileSync(`public/bench${t.image.replace("/bench", "")}`, jpegs.get(t.id)!);
  } else {
    // 2. path-traced render with exact visibility. A task whose exact check fails is rebuilt from a new seed.
    for (let round = 0; round < 4; round++) {
      writeFileSync("public/bench/tasks.json", JSON.stringify(tasks, null, 2));
      const todo = tasks.filter((t) => t.visibility.length === 0).map((t) => t.id);
      if (!todo.length) break;
      console.log(`blender round ${round + 1}: rendering ${todo.length} task(s)`);
      const results = runBlender(blender!, todo, samples);
      for (const r of results) {
        const idx = tasks.findIndex((t) => t.id === r.id);
        const t = tasks[idx];
        const vis = r.ok && r.visibility ? exactVisibility(t, r.visibility) : [];
        if (vis.length && vis.every((v) => v.ok)) {
          t.visibility = vis;
        } else {
          console.log(`  ${t.id} failed the exact visibility check${r.error ? ` (${r.error})` : ""}; rebuilding from a new seed`);
          const p = plan[idx];
          const { task } = await generateTask({ kind: p.kind, seed: t.seed + 100003 * (round + 1), objects: p.objects, lighting: p.lighting, stable: p.stable });
          task.image = `/bench/images/${task.id}.jpg`;
          task.visibility = [];
          tasks[idx] = task;
        }
      }
    }
    const unresolved = tasks.filter((t) => t.visibility.length === 0 || !t.visibility.every((v) => v.ok));
    if (unresolved.length) throw new Error(`could not render valid tasks: ${unresolved.map((t) => t.id).join(", ")}`);
  }

  writeFileSync("public/bench/tasks.json", JSON.stringify(tasks, null, 2));
  const keep = new Set(tasks.map((t) => `${t.id}.jpg`));
  for (const f of readdirSync("public/bench/images")) if (!keep.has(f)) rmSync(`public/bench/images/${f}`);
  rmSync("public/bench/.mask-tmp", { recursive: true, force: true });
  console.log(`wrote ${tasks.length} tasks (${renderer}) to public/bench/tasks.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
