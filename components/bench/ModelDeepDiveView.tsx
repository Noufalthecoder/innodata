"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/bench/types";
import { modelLabel } from "@/lib/bench/labels";
import { MODEL_PROFILES } from "@/lib/bench/modelProfiles";
import { FAILURE_DEEP_DIVES } from "@/lib/bench/failures";

interface TaskResultRow {
  id: string;
  raw: string;
  choice: number | null;
  correct: boolean;
  error?: string;
}

interface ModelResultFile {
  provider: string;
  model: string;
  ran: string;
  results: TaskResultRow[];
}

interface ModelDeepDiveViewProps {
  modelId: string;
  tasks: Task[];
  onBack: () => void;
  onInspectTask: (task: Task) => void;
}

export default function ModelDeepDiveView({
  modelId,
  tasks,
  onBack,
  onInspectTask,
}: ModelDeepDiveViewProps) {
  const [data, setData] = useState<ModelResultFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>("all");

  const profile = MODEL_PROFILES[modelId] ?? {
    id: modelId,
    name: modelLabel(modelId),
    architecture: "Multimodal Foundation Model",
    license: "API Access",
    headline: "Evaluated on 60 SpatialGrid visual tasks.",
    keyFindings: [],
    strengths: ["General spatial perception"],
    weaknesses: ["3D orientation and stability edge cases"],
  };

  useEffect(() => {
    const filename = modelId.replace(/[^a-z0-9._-]/gi, "_");
    fetch(`/bench/results/${filename}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res: ModelResultFile) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [modelId]);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const wrongResults = useMemo(() => {
    if (!data) return [];
    return data.results.filter((r) => !r.correct && tasksById.has(r.id));
  }, [data, tasksById]);

  const filteredErrors = useMemo(() => {
    if (tierFilter === "all") return wrongResults;
    if (tierFilter === "shared") {
      return wrongResults.filter((r) => r.id in FAILURE_DEEP_DIVES);
    }
    return wrongResults.filter((r) => {
      const task = tasksById.get(r.id);
      return task && String(task.tier) === tierFilter;
    });
  }, [wrongResults, tierFilter, tasksById]);

  const total = data?.results.length ?? 60;
  const correctCount = data?.results.filter((r) => r.correct).length ?? 0;
  const accuracyPct = Math.round((correctCount / (total || 1)) * 100);

  return (
    <div className="space-y-8 pb-10">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            ← Back to Leaderboard
          </button>
          <span className="font-semibold text-white text-sm">{profile.name}</span>
          <span className="rounded bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {accuracyPct}% Accuracy
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-500">
          {correctCount} of {total} correct · {wrongResults.length} errors
        </span>
      </div>

      {/* Model Diagnostic Profile Card */}
      <div className="rounded-lg border border-white/10 bg-[#0e0f13] p-6 space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-accent uppercase tracking-wider">
              Diagnostic Model Profile
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
              {profile.architecture}
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
              {profile.license}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{profile.name}</h3>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed max-w-4xl">{profile.headline}</p>
        </div>

        {profile.keyFindings.length > 0 && (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Evaluator Findings
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 text-xs text-zinc-300">
              {profile.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border border-white/5 bg-black/20 p-2.5">
                  <span className="text-accent">▪</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Observed Strengths
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.strengths.map((s) => (
                <span
                  key={s}
                  className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs text-emerald-300"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Cognitive Blindspots
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.weaknesses.map((w) => (
                <span
                  key={w}
                  className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-xs text-amber-300"
                >
                  ⚠ {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Gallery for this Specific Model */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-white">
              Error Gallery · {wrongResults.length} Missed Tasks
            </h4>
            <p className="text-xs text-zinc-400">
              Visual tasks where {profile.name} failed against computed ground truth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: `All Errors (${wrongResults.length})` },
              { id: "1", label: "Pose (Tier 1)" },
              { id: "2", label: "Relative (Tier 2)" },
              { id: "3", label: "Stability (Tier 3)" },
              { id: "shared", label: "Shared Failures" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTierFilter(f.id)}
                className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                  tierFilter === f.id
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading model error tasks…</p>
        ) : filteredErrors.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#0e0f13] p-8 text-center text-sm text-zinc-400">
            No errors match the selected filter.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredErrors.map((r) => {
              const task = tasksById.get(r.id);
              if (!task) return null;
              const isSharedFailure = r.id in FAILURE_DEEP_DIVES;
              const failureInfo = isSharedFailure ? FAILURE_DEEP_DIVES[r.id] : null;

              return (
                <div
                  key={r.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-[#0e0f13] transition-colors hover:border-white/30"
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={task.image} alt={task.question} loading="lazy" className="h-full w-full object-cover" />
                      <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {task.id}
                      </div>
                      {isSharedFailure && (
                        <div className="absolute top-2 right-2 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Failed by All Models
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2">
                      <p className="text-xs font-medium text-white line-clamp-2">{task.question}</p>

                      <div className="space-y-1 rounded bg-black/30 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Model answer:</span>
                          <span className="font-semibold text-red-400">
                            {r.choice !== null && r.choice !== undefined
                              ? task.options[r.choice]
                              : r.raw || "None"}{" "}
                            ✕
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-1">
                          <span className="text-zinc-500">Ground truth:</span>
                          <span className="font-semibold text-emerald-400">
                            {task.options[task.answer]} ✓
                          </span>
                        </div>
                      </div>

                      {failureInfo ? (
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                          <strong className="text-zinc-300">{failureInfo.illusionTitle}:</strong>{" "}
                          {failureInfo.visualCause}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                          {task.explanation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 p-3 bg-black/20">
                    <button
                      type="button"
                      onClick={() => onInspectTask(task)}
                      className="w-full rounded border border-white/15 bg-white/5 py-1.5 text-center text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Inspect in 3D →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
