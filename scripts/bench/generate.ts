// npm run bench:generate -- --count 60 --seed 1
// Writes public/bench/tasks.json and public/bench/images/*.jpg
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { generateTask } from "../../lib/bench/tasks";
import type { Kind, Task } from "../../lib/bench/types";
import { arg } from "./env";

async function main() {
  const count = Number(arg("count", "60"));
  const seed0 = Number(arg("seed", "1"));
  rmSync("public/bench/images", { recursive: true, force: true });
  mkdirSync("public/bench/images", { recursive: true });

  // balanced mix across the three tiers, cycling difficulty (object count and lighting)
  const plan: { kind: Kind; objects?: number }[] = [];
  const kinds: Kind[] = ["closer", "leftmost", "orientation", "stability", "closer", "stability"];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const objects = kind === "closer" || kind === "leftmost" ? 2 + (Math.floor(i / kinds.length) % 4) : kind === "stability" ? 2 + (Math.floor(i / kinds.length) % 3) : undefined;
    plan.push({ kind, objects });
  }

  const tasks: Task[] = [];
  for (const [i, p] of plan.entries()) {
    const seed = seed0 + i;
    const lighting = i % 5 === 4 ? "dim" : "normal";
    const { task, jpeg } = await generateTask({ kind: p.kind, seed, objects: p.objects, lighting });
    const file = `public/bench/images/${task.id}.jpg`;
    writeFileSync(file, jpeg);
    task.image = `/bench/images/${task.id}.jpg`;
    tasks.push(task);
    console.log(`${String(i + 1).padStart(3)}/${count} ${task.id} ${task.kind} objects=${task.difficulty.objects} ${lighting}`);
  }
  writeFileSync("public/bench/tasks.json", JSON.stringify(tasks, null, 2));
  console.log(`wrote ${tasks.length} tasks to public/bench/tasks.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
