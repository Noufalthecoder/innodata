// npm run bench:validate
// Proves the ground truth is not hand-made: (1) re-derives every answer from raw scene numbers with independent code,
// (2) rebuilds every task from its seed and checks it is identical, (3) checks every visibility report passed.
import { readFileSync } from "node:fs";
import { generateTask } from "../../lib/bench/tasks";
import { deriveAnswer } from "../../lib/bench/truth";
import type { Task } from "../../lib/bench/types";

async function main() {
  const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
  let derivedBad = 0, seedBad = 0, visBad = 0;
  for (const t of tasks) {
    if (deriveAnswer(t) !== t.answer) {
      derivedBad++;
      console.log(`MISMATCH (re-derived) ${t.id} ${t.kind}: stored ${t.answer}, derived ${deriveAnswer(t)}`);
    }
    if (!t.visibility.every((v) => v.ok)) {
      visBad++;
      console.log(`VISIBILITY ${t.id}`);
    }
    const { task } = await generateTask({ kind: t.kind, seed: t.seed, objects: t.difficulty.objects, lighting: t.difficulty.lighting, stable: t.gen?.stable });
    if (JSON.stringify(task.objects) !== JSON.stringify(t.objects) || task.answer !== t.answer || task.question !== t.question) {
      seedBad++;
      console.log(`NOT REPRODUCIBLE ${t.id}`);
    }
  }
  console.log(`\nTasks checked: ${tasks.length}`);
  console.log(`Answers re-derived independently: ${tasks.length - derivedBad}/${tasks.length} match`);
  console.log(`Rebuilt identically from seed:    ${tasks.length - seedBad}/${tasks.length}`);
  console.log(`Visibility check passed:          ${tasks.length - visBad}/${tasks.length}`);
  if (derivedBad || seedBad || visBad) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
