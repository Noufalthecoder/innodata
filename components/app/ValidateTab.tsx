"use client";

import { useEffect, useState } from "react";
import { GITHUB_URL } from "@/lib/content";

type Report = {
  total: number;
  rederived: { checked: number; matched: number; mismatches: string[] };
  visibility: { checked: number; passed: number; failures: string[] };
  reproducible: { checked: number; matched: number; failures: string[]; ids: string[] };
  checkedAt?: string;
  cached?: boolean;
};

const HOW = [
  {
    title: "Independent re-derivation",
    file: "lib/bench/truth.ts",
    body: "A second implementation, sharing no code with the generator, recomputes every answer from the raw scene numbers: camera distances, perspective projection, container yaw and the centre-of-mass rule. Every stored answer must match.",
  },
  {
    title: "Visibility check",
    file: "scripts/blender/render.py",
    body: "Blender re-renders each object as a flat-colour mask and counts its pixels in the scene and on its own. Every object asked about must be at least 70% visible, fully in frame and at least 2,500 px, or the task is rebuilt.",
  },
  {
    title: "Reproducibility",
    file: "lib/bench/tasks.ts",
    body: "Generation is deterministic. A sample of tasks is rebuilt from nothing but their seed, and the objects, camera, question, options and answer must come out identical.",
  },
];

const TESTS = [
  "Hand-computed cases for every task kind, including perspective",
  "Generator and re-derivation agree on 500 random stacks",
  "Occluded, off-frame and tiny objects are rejected",
  "Mutation tests: corrupted answers and altered scenes are caught",
  "The answer never reaches a model; ambiguous replies score as wrong",
  "Bring-your-own keys are never stored, logged or echoed",
];

export default function ValidateTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ranAt, setRanAt] = useState<Date | null>(null);

  async function run(fresh = true) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bench/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fresh }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setReport(j);
      setRanAt(j.checkedAt ? new Date(j.checkedAt) : new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // on open: the latest real check of this exact dataset (run now if there is none); "Run again" always re-runs it
  useEffect(() => {
    run(false);
  }, []);

  const cards = [
    { label: "Answers re-derived", sub: "by independent code, from raw scene numbers", ok: report?.rederived.matched, n: report?.rederived.checked, bad: report?.rederived.mismatches },
    { label: "Visibility check passed", sub: "every object clearly visible in the image", ok: report?.visibility.passed, n: report?.visibility.checked, bad: report?.visibility.failures },
    { label: "Rebuilt identically", sub: report ? `from seed: ${report.reproducible.ids.join(", ")}` : "from seed, sample of tasks", ok: report?.reproducible.matched, n: report?.reproducible.checked, bad: report?.reproducible.failures },
  ];
  const allPass = report && cards.every((c) => c.ok === c.n);

  return (
    <div className="space-y-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-3xl text-lg leading-relaxed text-zinc-300">
          Ground truth must come from numbers we generated, never from a person or a model. This proof runs on the server against the shipped dataset. Opening the panel shows the latest check; Run again repeats it from scratch.
        </p>
        <div className="flex shrink-0 items-center gap-4">
          {report && !busy && (
            <span className={`rounded-full border px-3 py-1 text-sm font-medium ${allPass ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
              {allPass ? "All checks passed" : "Check failed"}
              {ranAt && <span className="ml-2 font-normal text-zinc-500">checked {ranAt.toLocaleTimeString()}</span>}
            </span>
          )}
          <button onClick={() => run(true)} disabled={busy} className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy ? "Validating…" : report ? "Run again" : "Run validation"}
          </button>
        </div>
      </div>
      {error && <p className="text-red-300">{error}</p>}

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c) => {
          const ready = report && !busy;
          const pass = ready && c.ok === c.n;
          return (
            <div key={c.label} className={`rounded-xl border p-7 transition-colors ${!ready ? "border-white/10" : pass ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-red-500/40 bg-red-500/[0.05]"}`}>
              <div className="flex items-start justify-between">
                <p className={`text-6xl font-semibold tracking-tight ${!ready ? "text-zinc-700" : pass ? "text-emerald-400" : "text-red-400"}`}>
                  {ready ? `${c.ok}/${c.n}` : busy ? "…" : "–"}
                </p>
                {ready && <span className={`grid h-8 w-8 place-items-center rounded-full text-lg ${pass ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{pass ? "✓" : "✕"}</span>}
                {busy && <span className="mt-2 h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />}
              </div>
              <p className="mt-5 text-lg font-semibold text-white">{c.label}</p>
              <p className="mt-1 text-sm text-zinc-500">{c.sub}</p>
              {ready && c.bad && c.bad.length > 0 && <p className="mt-3 text-sm text-red-300">Failing: {c.bad.join(", ")}</p>}
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="mb-5 text-sm font-medium uppercase tracking-wider text-zinc-500">How each check works</h3>
        <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
          {HOW.map((h, i) => (
            <div key={h.title} className="bg-ink p-7">
              <p className="font-mono text-sm text-accent">0{i + 1}</p>
              <p className="mt-3 text-lg font-semibold text-white">{h.title}</p>
              <p className="mt-2 leading-relaxed text-zinc-400">{h.body}</p>
              <a href={`${GITHUB_URL}/blob/main/${h.file}`} target="_blank" rel="noreferrer" className="mt-4 inline-block font-mono text-xs text-zinc-500 hover:text-white">
                {h.file} ↗
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 pb-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">The stability rule, in full</h3>
          <p className="leading-relaxed text-zinc-400">
            A stack is stable only if, for every box, the horizontal centre of mass of all boxes above it lies within that box&apos;s top face. Boxes have equal size and equal density. Tasks are kept only when every margin is at least 12 cm, so no case is borderline.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg border border-white/10 bg-black/40 p-5 text-sm text-zinc-300">{`stable = for every level i:  lo(i-1) <= com(boxes i..top) <= hi(i-1)

kept in the dataset only if, at every level,
  |com - nearest edge| >= 0.12 m          (no borderline cases)`}</pre>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Also enforced by 117 automated tests</h3>
          <ul className="space-y-2.5">
            {TESTS.map((t) => (
              <li key={t} className="flex gap-3 text-zinc-300">
                <span className="text-emerald-400">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <a href={`${GITHUB_URL}/tree/main/tests/bench`} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
            Read the test suite on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}
