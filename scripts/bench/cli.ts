// npm run sg -- <command>
// SpatialGrid command line: generate a task package, inspect a task, re-derive every answer, read the leaderboard.
//   sg generate --kind stability --seed 7 [--objects 3] [--lighting dim] [--out out]
//   sg inspect s34
//   sg validate
//   sg report
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deriveAnswer } from "../../lib/bench/truth";
import { generateTask, KIND_TIER } from "../../lib/bench/tasks";
import { modelLabel } from "../../lib/bench/labels";
import { TIER_LABEL, type Kind, type Task } from "../../lib/bench/types";
import { arg } from "./env";

const on = process.stdout.isTTY || process.env.FORCE_COLOR;
const rgb = (r: number, g: number, b: number) => (s: string) => (on ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s);
const bold = (s: string) => (on ? `\x1b[1m${s}\x1b[22m` : s);
const dim = (s: string) => (on ? `\x1b[2m${s}\x1b[22m` : s);
const blue = rgb(79, 140, 255);
const orange = rgb(245, 158, 11);
const purple = rgb(167, 139, 250);
const green = rgb(52, 211, 153);
const red = rgb(248, 113, 113);
const grey = rgb(139, 149, 166);
const white = rgb(236, 241, 250);
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - strip(s).length));
const padL = (s: string, n: number) => " ".repeat(Math.max(0, n - strip(s).length)) + s;
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out = (s = "") => process.stdout.write(s + "\n");

function banner() {
  out();
  out(`  ${blue(bold("◆ SPATIALGRID"))}  ${dim("·")}  ${grey("spatial-reasoning benchmark factory")}`);
  out(`  ${grey("depth · pose · stability   —   every answer computed, never labelled")}`);
  out();
}

const bar = (v: number, w = 22, color = blue) => color("█".repeat(Math.round(v * w))) + dim("░".repeat(w - Math.round(v * w)));
const rule = (w = 64) => dim("─".repeat(w));
const KIND_COLOR: Record<Kind, (s: string) => string> = { orientation: blue, closer: purple, leftmost: orange, stability: green };

async function step(label: string, detail: string, ms = 260) {
  process.stdout.write(`  ${blue("●")} ${pad(label, 20)}`);
  await sleep(ms);
  out(`${green("✔")} ${grey(detail)}`);
}

function card(t: Task) {
  const kc = KIND_COLOR[t.kind];
  out(`  ${kc("▌")} ${bold(white(t.id))}  ${kc(t.kind)}  ${dim("·")}  ${grey(TIER_LABEL[t.tier])}  ${dim("·")}  ${grey(`${t.difficulty.objects} objects, ${t.difficulty.lighting} light`)}`);
  out();
  out(`  ${white(t.question)}`);
  out();
  t.options.forEach((o, i) => {
    const hit = i === t.answer;
    out(`    ${hit ? green("●") : dim("○")} ${hit ? green(bold(`${"ABCDEF"[i]}.`)) : grey(`${"ABCDEF"[i]}.`)} ${hit ? green(o) : grey(o)}${hit ? `  ${green("← computed answer")}` : ""}`);
  });
}

async function generate() {
  const kind = (arg("kind", "stability") as Kind);
  if (!(kind in KIND_TIER)) throw new Error(`--kind must be one of ${Object.keys(KIND_TIER).join(", ")}`);
  const seed = Number(arg("seed", "7"));
  const objects = arg("objects") ? Number(arg("objects")) : undefined;
  const lighting = arg("lighting") === "dim" ? "dim" : "normal";
  banner();
  out(`  ${bold("generate")}  ${grey(`kind=${kind}  seed=${seed}${objects ? `  objects=${objects}` : ""}  lighting=${lighting}`)}`);
  out(`  ${rule()}`);
  const t0 = Date.now();
  await step("scene", "layout built from seed");
  const { task, jpeg } = await generateTask({ kind, seed, objects, lighting });
  await step("ground truth", "answer computed from geometry");
  const re = deriveAnswer(task);
  await step("independent check", re === task.answer ? "second implementation agrees" : "MISMATCH", 200);
  if (re !== task.answer) throw new Error("independent re-derivation disagrees");
  const minVis = Math.min(...task.visibility.map((v) => v.visiblePct));
  await step("visibility", `${task.visibility.length} objects, min ${minVis}% visible`);
  const dir = `${arg("out", "out")}/${task.id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/task.json`, JSON.stringify(task, null, 2));
  writeFileSync(`${dir}/image.jpg`, jpeg);
  await step("package", `${dir}/{task.json, image.jpg}`);
  out(`  ${rule()}`);
  card(task);
  out();
  out(`  ${dim(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s · preview render (photoreal needs Blender: npm run bench:generate)`)}`);
  out();
}

function inspect() {
  const id = process.argv[3];
  const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
  const t = tasks.find((x) => x.id === id);
  banner();
  if (!t) throw new Error(`no task "${id}". Try one of: ${tasks.slice(0, 6).map((x) => x.id).join(", ")} …`);
  out(`  ${bold("inspect")}  ${grey(t.image)}`);
  out(`  ${rule()}`);
  card(t);
  out();
  out(`  ${bold("visibility")}`);
  for (const v of t.visibility) out(`    ${v.ok ? green("✔") : red("✘")} ${pad(white(v.object), 14)} ${bar(v.visiblePct / 100, 18, v.ok ? green : red)} ${padL(`${v.visiblePct}%`, 4)}  ${dim(`${v.pixels.toLocaleString()} px`)}`);
  out();
  out(`  ${bold("why")}  ${grey(t.explanation.length > 150 ? t.explanation.slice(0, 147) + "…" : t.explanation)}`);
  out();
}

async function validate() {
  const tasks: Task[] = JSON.parse(readFileSync("public/bench/tasks.json", "utf8"));
  banner();
  out(`  ${bold("validate")}  ${grey(`${tasks.length} tasks · independent re-derivation`)}`);
  out(`  ${rule()}`);
  const kinds = Object.keys(KIND_TIER) as Kind[];
  let all = true;
  for (const k of kinds) {
    const ts = tasks.filter((t) => t.kind === k);
    const ok = ts.filter((t) => deriveAnswer(t) === t.answer).length;
    all &&= ok === ts.length;
    out(`    ${KIND_COLOR[k]("▌")} ${pad(white(k), 14)} ${bar(ok / ts.length, 24, green)}  ${green(`${ok}/${ts.length}`)} ${dim("answers re-derived")}`);
    await sleep(120);
  }
  const vis = tasks.filter((t) => t.visibility.every((v) => v.ok)).length;
  out(`    ${blue("▌")} ${pad(white("visibility"), 14)} ${bar(vis / tasks.length, 24, green)}  ${green(`${vis}/${tasks.length}`)} ${dim("checks passed")}`);
  out(`  ${rule()}`);
  out(`  ${all && vis === tasks.length ? green(bold("✔ all answers verified")) : red(bold("✘ mismatches found"))}`);
  out();
}

function report() {
  const s = JSON.parse(readFileSync("public/bench/summary.json", "utf8"));
  banner();
  out(`  ${bold("report")}  ${grey(`${s.taskCount} tasks · temperature 0 · 95% Wilson intervals`)}`);
  out(`  ${rule(78)}`);
  out(`  ${dim(pad("#", 3) + pad("model", 26) + pad("accuracy", 31) + pad("95% CI", 13) + "weakest")}`);
  const models = (s.models as any[]).slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  const top = s.best?.overall?.all;
  const sig = new Set((s.vsLeader ?? []).filter((v: any) => v.pValue < 0.05).map((v: any) => v.model));
  models.forEach((m, i) => {
    const name = modelLabel(m.model).replace(/ \(.*\)$/, "");
    const tag = top?.leader.includes(m.model) ? orange(" ★ top") : top?.tied.includes(m.model) && !sig.has(m.model) ? dim(" ≈ tied") : "";
    out(`  ${pad(grey(String(i + 1)), 3)}${pad(white(name), 26)}${bar(m.overall.accuracy, 18, i === 0 ? orange : blue)} ${padL(bold(pct(m.overall.accuracy)), 6)}  ${pad(dim(`${(m.ci95.low * 100).toFixed(0)}–${(m.ci95.high * 100).toFixed(0)}`), 11)}${padL(pct(m.worstKindAccuracy, 0), 5)}${tag}`);
  });
  out(`  ${rule(78)}`);
  const leader = models[0];
  const behind = (s.vsLeader ?? []).filter((v: any) => v.pValue < 0.05);
  out(`  ${orange("★")} ${white(modelLabel(leader.model).replace(/ \(.*\)$/, ""))} leads · significantly ahead of ${behind.map((v: any) => modelLabel(v.model).replace(/ \(.*\)$/, "")).join(", ")}`);
  out(`    ${dim(`paired McNemar test, p = ${behind.map((v: any) => v.pValue.toFixed(3)).join(" / ")}`)}`);
  out(`  ${grey("hardest skill: orientation · scenes that beat every model:")} ${red((s.allWrong as string[]).join(" "))}`);
  out();
}

function help() {
  banner();
  out(`  ${bold("commands")}`);
  const rows: [string, string, string][] = [
    ["generate", "--kind stability --seed 7", "build a task package: scene, truth, visibility, image"],
    ["inspect", "<task id>", "show a task, its answer and visibility report"],
    ["validate", "", "re-derive every answer with independent code"],
    ["report", "", "leaderboard with confidence intervals and ties"],
  ];
  for (const [c, a, d] of rows) out(`    ${blue("▸")} ${pad(bold(white(c)), 12)} ${pad(dim(a), 28)} ${grey(d)}`);
  out();
  out(`  ${dim("run with:  npm run sg -- <command>")}`);
  out();
}

const cmd = process.argv[2];
const run = { generate, inspect, validate, report, help } as Record<string, () => unknown>;
Promise.resolve((run[cmd ?? "help"] ?? help)()).catch((e) => {
  out(`\n  ${red("✘")} ${e.message ?? e}\n`);
  process.exit(1);
});
