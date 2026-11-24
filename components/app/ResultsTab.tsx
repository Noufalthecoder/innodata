"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/bench/types";
import { modelLabel } from "@/lib/bench/labels";
import TaskComparisonView from "@/components/bench/TaskComparisonView";
import ModelDeepDiveView from "@/components/bench/ModelDeepDiveView";

type Acc = { n: number; correct: number; accuracy: number };
type Best = { leader: string[]; tied: string[]; accuracy: number };
type ModelSummary = {
  provider: string;
  model: string;
  overall: Acc;
  ci95?: { low: number; high: number };
  chanceAdjusted?: number;
  macroKindAccuracy?: number;
  worstKindAccuracy?: number;
  errors: number;
  byTier: Record<string, Acc>;
  byKind: Record<string, Acc>;
  byObjects: Record<string, Acc>;
  byLighting: Record<string, Acc>;
};
type Summary = {
  generated: string;
  taskCount: number;
  models: ModelSummary[];
  best?: Record<string, Record<string, Best>>;
  vsLeader?: { model: string; leader: string; pValue: number }[];
  allWrong: string[];
};

const CATEGORIES: [string, string, string][] = [
  ["tier", "tier1", "Tier 1 · Pose"],
  ["tier", "tier2", "Tier 2 · Relative"],
  ["tier", "tier3", "Tier 3 · Stability"],
  ["kind", "orientation", "Orientation"],
  ["kind", "stability", "Stability"],
  ["lighting", "dim", "Dim light"],
];

const pct = (a?: Acc) => (a && a.n ? `${Math.round(a.accuracy * 100)}%` : "n/a");
const p1 = (x?: number) => (x === undefined ? "n/a" : `${(x * 100).toFixed(0)}%`);
const names = (ids: string[]) => ids.map(modelLabel).join(" = ");

export default function ResultsTab() {
  const [s, setS] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [inspectTask, setInspectTask] = useState<Task | null>(null);

  useEffect(() => {
    fetch("/bench/summary.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setS)
      .catch(() => setFailed(true));

    fetch("/bench/tasks.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setTasks)
      .catch(() => {});
  }, []);

  if (failed)
    return (
      <p className="text-zinc-400">
        No summary yet. Run <code className="text-zinc-200">npm run bench:report</code>.
      </p>
    );
  if (!s) return <p className="text-zinc-500">Loading…</p>;

  // 1. If 3D inspection is active
  if (inspectTask) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setInspectTask(null)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          ← Back to {selectedModel ? modelLabel(selectedModel) : "Leaderboard"}
        </button>
        <TaskComparisonView task={inspectTask} onBack={() => setInspectTask(null)} />
      </div>
    );
  }

  // 2. If a specific model is selected, show its Profile + Model Error Gallery
  if (selectedModel && tasks) {
    return (
      <ModelDeepDiveView
        modelId={selectedModel}
        tasks={tasks}
        onBack={() => setSelectedModel(null)}
        onInspectTask={(t) => setInspectTask(t)}
      />
    );
  }

  const models = (s.models ?? []).slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  const top = s.best?.overall?.all;
  const significant = new Set((s.vsLeader ?? []).filter((v) => v.pValue < 0.05).map((v) => v.model));

  // 3. Clean Leaderboard View (Table ONLY)
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Click any model row to view its in-depth profile and error gallery.
        </p>
        <span className="font-mono text-xs text-zinc-500">
          {s.taskCount} tasks evaluated · Temperature 0
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Model</th>
              <th className="px-5 py-3 font-medium">Overall · 95% CI</th>
              <th className="px-5 py-3 font-medium" title="0% = random guessing, 100% = perfect">Above chance</th>
              <th className="px-5 py-3 font-medium" title="Average of the four skills, each weighted equally">Skill avg</th>
              <th className="px-5 py-3 font-medium" title="Accuracy on the model's weakest skill">Weakest skill</th>
              <th className="px-5 py-3 font-medium">Tier 1 · Pose</th>
              <th className="px-5 py-3 font-medium">Tier 2 · Relative</th>
              <th className="px-5 py-3 font-medium">Tier 3 · Stability</th>
              <th className="px-5 py-3 font-medium">Normal light</th>
              <th className="px-5 py-3 font-medium">Dim light</th>
              <th className="px-5 py-3 font-medium">Errors</th>
              <th className="px-5 py-3 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {models.map((m) => (
              <tr
                key={m.model}
                onClick={() => setSelectedModel(m.model)}
                className="group cursor-pointer transition-colors hover:bg-white/[0.04]"
              >
                <td className="px-5 py-4 font-medium text-white group-hover:text-accent transition-colors">
                  {modelLabel(m.model)}
                </td>
                <td className="px-5 py-4 font-semibold text-accent">
                  {pct(m.overall)}
                  {m.ci95 && (
                    <span className="ml-2 font-mono text-xs font-normal text-zinc-500">
                      {p1(m.ci95.low)}–{p1(m.ci95.high)}
                    </span>
                  )}
                  {top?.leader.includes(m.model) && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">top</span>}
                  {top?.tied.includes(m.model) && !significant.has(m.model) && (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300" title="Statistically tied with the leader (paired test, p ≥ 0.05)">
                      tied
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-300">{p1(m.chanceAdjusted)}</td>
                <td className="px-5 py-4 text-zinc-300">{p1(m.macroKindAccuracy)}</td>
                <td className="px-5 py-4 text-zinc-300">{p1(m.worstKindAccuracy)}</td>
                <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier1)}</td>
                <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier2)}</td>
                <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier3)}</td>
                <td className="px-5 py-4 text-zinc-300">{pct(m.byLighting.normal)}</td>
                <td className="px-5 py-4 text-zinc-300">{pct(m.byLighting.dim)}</td>
                <td className="px-5 py-4 font-mono text-xs text-zinc-500">{m.errors}</td>
                <td className="px-5 py-4 text-right text-xs text-zinc-500 group-hover:text-zinc-200">
                  Analyze →
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s.best && (
        <div className="rounded-lg border border-white/10 p-5">
          <h3 className="text-sm font-medium text-white">Best model for each skill</h3>
          <p className="mt-1 text-xs text-zinc-500">
            With about 10 tasks per category, a one-task lead is noise. Models whose 95% interval overlaps the leader's are listed as tied instead of beaten.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(([group, key, label]) => {
              const b = s.best?.[group]?.[key];
              if (!b) return null;
              return (
                <div key={label} className="rounded-md bg-white/[0.03] p-3">
                  <dt className="text-xs text-zinc-500">{label}</dt>
                  <dd className="mt-1 text-sm text-white">
                    {names(b.leader)} <span className="font-mono text-xs text-accent">{p1(b.accuracy)}</span>
                  </dd>
                  <dd className="mt-1 text-xs text-zinc-500">
                    {b.tied.length ? `Not clearly behind: ${b.tied.length} other${b.tied.length > 1 ? "s" : ""}` : "Clear leader"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Generated {new Date(s.generated).toLocaleDateString()}. Benchmark evaluates spatial perception without hand-labeling.
      </p>
    </div>
  );
}
