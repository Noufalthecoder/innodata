"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/bench/types";
import { modelLabel } from "@/lib/bench/labels";
import { FAILURE_DEEP_DIVES } from "@/lib/bench/failures";
import TaskComparisonView from "@/components/bench/TaskComparisonView";

type Acc = { n: number; correct: number; accuracy: number };
type ModelSummary = {
  provider: string;
  model: string;
  overall: Acc;
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
  allWrong: string[];
};

interface TaskResultRow {
  id: string;
  raw: string;
  choice: number | null;
  correct: boolean;
  error?: string;
}

const pct = (a?: Acc) => (a && a.n ? `${Math.round(a.accuracy * 100)}%` : "n/a");

export default function ResultsTab() {
  const [s, setS] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [inspectTask, setInspectTask] = useState<Task | null>(null);

  // Active filter in the Error Gallery
  // "shared" = 7 scenes all models got wrong, or a specific model ID
  const [activeModelTab, setActiveModelTab] = useState<string>("shared");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [modelResults, setModelResults] = useState<Record<string, TaskResultRow[]>>({});
  const [loadingModel, setLoadingModel] = useState<boolean>(false);

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

  // Fetch model results on demand when a model tab is selected
  useEffect(() => {
    if (activeModelTab === "shared") return;
    if (modelResults[activeModelTab]) return;

    setLoadingModel(true);
    const filename = activeModelTab.replace(/[^a-z0-9._-]/gi, "_");
    fetch(`/bench/results/${filename}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setModelResults((prev) => ({ ...prev, [activeModelTab]: data.results || [] }));
      })
      .catch(() => {})
      .finally(() => setLoadingModel(false));
  }, [activeModelTab, modelResults]);

  const tasksById = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks]);

  // If a task is selected for 3D inspection, render the full 3D viewer
  if (inspectTask) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setInspectTask(null)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          ← Back to Leaderboard
        </button>
        <TaskComparisonView task={inspectTask} onBack={() => setInspectTask(null)} />
      </div>
    );
  }

  if (failed)
    return (
      <p className="text-zinc-400">
        No summary yet. Run <code className="text-zinc-200">npm run bench:report</code>.
      </p>
    );
  if (!s) return <p className="text-zinc-500">Loading…</p>;

  const models = (s.models ?? []).slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  const sharedIds = s.allWrong ?? ["s4", "s9", "s27", "s28", "s34", "s52", "s57"];

  // Compute error cards to show
  let currentErrors: {
    task: Task;
    modelAnswerText?: string;
    isShared: boolean;
    failureReason?: string;
  }[] = [];

  if (activeModelTab === "shared") {
    currentErrors = sharedIds
      .map((id) => tasksById.get(id))
      .filter((t): t is Task => !!t)
      .map((t) => {
        const failure = FAILURE_DEEP_DIVES[t.id];
        return {
          task: t,
          modelAnswerText: failure
            ? `${failure.modelAnswers[0].answer} (Consensus)`
            : "All models failed",
          isShared: true,
          failureReason: failure ? failure.visualCause : t.explanation,
        };
      });
  } else {
    const rawResults = modelResults[activeModelTab] || [];
    const wrong = rawResults.filter((r) => !r.correct && tasksById.has(r.id));
    currentErrors = wrong
      .map((r) => {
        const t = tasksById.get(r.id)!;
        const failure = FAILURE_DEEP_DIVES[t.id];
        const chosenText =
          r.choice !== null && r.choice !== undefined
            ? t.options[r.choice]
            : r.raw || "Unparsed";
        return {
          task: t,
          modelAnswerText: chosenText,
          isShared: sharedIds.includes(t.id),
          failureReason: failure ? failure.visualCause : t.explanation,
        };
      });
  }

  // Filter by Tier
  if (tierFilter !== "all") {
    currentErrors = currentErrors.filter((item) => String(item.task.tier) === tierFilter);
  }

  return (
    <div className="space-y-10 pb-8">
      {/* SECTION 1: Leaderboard Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Click any model row to filter errors in the gallery below.
          </p>
          <span className="font-mono text-xs text-zinc-500">
            {s.taskCount} tasks evaluated · Temperature 0
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Overall</th>
                <th className="px-5 py-3 font-medium">Tier 1 · Pose</th>
                <th className="px-5 py-3 font-medium">Tier 2 · Relative</th>
                <th className="px-5 py-3 font-medium">Tier 3 · Stability</th>
                <th className="px-5 py-3 font-medium">Normal light</th>
                <th className="px-5 py-3 font-medium">Dim light</th>
                <th className="px-5 py-3 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {models.map((m) => {
                const isSelected = activeModelTab === m.model;
                return (
                  <tr
                    key={m.model}
                    onClick={() => setActiveModelTab(m.model)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-accent/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <td className={`px-5 py-4 font-medium ${isSelected ? "text-accent" : "text-white"}`}>
                      {modelLabel(m.model)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-accent">{pct(m.overall)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier1)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier2)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier3)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byLighting.normal)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byLighting.dim)}</td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-500">{m.errors}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Integrated Error Gallery */}
      <div className="border-t border-white/10 pt-8 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">Error Gallery</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Explore the exact visual tasks that fooled multimodal models versus computed ground truth.
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            {currentErrors.length} error{currentErrors.length === 1 ? "" : "s"} shown
          </span>
        </div>

        {/* Model Tabs & Tier Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Model Tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <button
              type="button"
              onClick={() => setActiveModelTab("shared")}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                activeModelTab === "shared"
                  ? "border-accent bg-accent/15 text-accent font-medium"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-white"
              }`}
            >
              Shared Failures ({sharedIds.length})
            </button>

            {models.map((m) => (
              <button
                key={m.model}
                type="button"
                onClick={() => setActiveModelTab(m.model)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  activeModelTab === m.model
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {modelLabel(m.model)} ({m.errors})
              </button>
            ))}
          </div>

          {/* Tier Filters */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-zinc-500 mr-1">Tier:</span>
            {[
              { id: "all", label: "All" },
              { id: "1", label: "Pose" },
              { id: "2", label: "Relative" },
              { id: "3", label: "Stability" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierFilter(t.id)}
                className={`rounded px-2 py-0.5 transition-colors ${
                  tierFilter === t.id
                    ? "bg-white/15 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Cards Grid */}
        {loadingModel ? (
          <p className="text-sm text-zinc-500">Loading model error tasks…</p>
        ) : currentErrors.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#0e0f13] p-8 text-center text-sm text-zinc-400">
            No errors match the selected filter.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentErrors.map(({ task, modelAnswerText, isShared, failureReason }) => (
              <div
                key={task.id}
                className="group flex flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-[#0e0f13] transition-colors hover:border-white/30"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={task.image}
                      alt={task.question}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                      {task.id}
                    </div>
                    {isShared && (
                      <div className="absolute top-2 right-2 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        All Models Failed
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-2.5">
                    <p className="text-xs font-medium text-white line-clamp-2">{task.question}</p>

                    <div className="space-y-1 rounded bg-black/30 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Model answer:</span>
                        <span className="font-semibold text-red-400">
                          {modelAnswerText} ✕
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1">
                        <span className="text-zinc-500">Ground truth:</span>
                        <span className="font-semibold text-emerald-400">
                          {task.options[task.answer]} ✓
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                      {failureReason}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 p-3 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setInspectTask(task)}
                    className="w-full rounded border border-white/15 bg-white/5 py-1.5 text-center text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Inspect in 3D →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
