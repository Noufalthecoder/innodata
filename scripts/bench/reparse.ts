// npm run bench:reparse [-- --retry-unparsed --model-id gemma-4-26b-a4b-it]
// Re-scores saved model replies with the current parser (no API calls). With --retry-unparsed, replies that still
// contain no answer (for example, cut off before the conclusion) are marked for bench:eval to ask again.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseChoice } from "../../lib/bench/models";
import type { Task } from "../../lib/bench/types";
import { arg } from "./env";

type Row = { id: string; raw: string; choice: number | null; correct: boolean; error?: string };
const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
const byId = new Map(tasks.map((t) => [t.id, t]));
const dir = "public/bench/results";
const only = arg("model-id");
const retry = process.argv.includes("--retry-unparsed");

for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith(".json")) : []) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { model: string; results: Row[] };
  if (only && j.model !== only) continue;
  let changed = 0, unparsed = 0;
  for (const r of j.results) {
    if (r.error) continue;
    const t = byId.get(r.id);
    if (!t) continue;
    const choice = parseChoice(r.raw, t.options.length);
    if (choice !== r.choice) changed++;
    r.choice = choice;
    r.correct = choice === t.answer;
    if (choice === null) {
      unparsed++;
      if (retry) r.error = "unparsed reply; marked for retry";
    }
  }
  writeFileSync(`${dir}/${f}`, JSON.stringify(j, null, 2));
  console.log(`${j.model}: ${changed} re-scored, ${unparsed} without an answer${retry && unparsed ? " (marked for retry)" : ""}`);
}
