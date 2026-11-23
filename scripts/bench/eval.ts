// npm run bench:eval -- --model gemini [--model-id gemini-3.5-flash] [--limit 20]
// Sends each task's image and question to a vision model and scores the reply against ground truth.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { askModel, MODELS, parseChoice, type Provider } from "../../lib/bench/models";
import type { Task } from "../../lib/bench/types";
import { arg, loadEnv } from "./env";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (attempt < 4 && (status === undefined || status === 429 || status >= 500)) await sleep(2000 * 2 ** attempt);
      else throw e;
    }
  }
}

async function main() {
  loadEnv();
  const provider = arg("model") as Provider;
  if (!provider || !(provider in MODELS)) throw new Error(`use --model ${Object.keys(MODELS).join("|")}`);
  const modelId = arg("model-id") ?? MODELS[provider].model;
  const key = process.env[MODELS[provider].env];
  if (!key) throw new Error(`${MODELS[provider].env} is not set (put it in .env.local)`);

  let tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
  const limit = Number(arg("limit", "0"));
  if (limit) tasks = tasks.slice(0, limit);

  const results: { id: string; raw: string; choice: number | null; correct: boolean; error?: string }[] = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const t = tasks[next++];
      try {
        const b64 = readFileSync(`public${t.image}`).toString("base64");
        // the ground-truth answer is never part of the request
        const raw = await withRetry(() => askModel(provider, key!, b64, t.question, t.options, modelId));
        if (!raw.trim()) throw new Error("empty reply from model");
        const choice = parseChoice(raw, t.options.length);
        results.push({ id: t.id, raw: raw.trim(), choice, correct: choice === t.answer });
      } catch (e) {
        results.push({ id: t.id, raw: "", choice: null, correct: false, error: String((e as Error).message).slice(0, 200) });
      }
      process.stdout.write(`\r${results.length}/${tasks.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  mkdirSync("public/bench/results", { recursive: true });
  writeFileSync(`public/bench/results/${modelId.replace(/[^a-z0-9._-]/gi, "_")}.json`, JSON.stringify({ provider, model: modelId, ran: new Date().toISOString(), results }, null, 2));
  const ok = results.filter((r) => r.correct).length;
  const errs = results.filter((r) => r.error).length;
  console.log(`\n${MODELS[provider].label}: ${ok}/${results.length} correct (${((ok / results.length) * 100).toFixed(1)}%), ${errs} errors`);
  if (errs) console.log("first error:", results.find((r) => r.error)?.error);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
