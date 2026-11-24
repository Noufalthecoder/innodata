"use client";

import { useEffect, useMemo, useState } from "react";
import { TIER_LABEL, type Task } from "@/lib/bench/types";
import TaskComparisonView from "@/components/bench/TaskComparisonView";
import { FAILURE_DEEP_DIVES } from "@/lib/bench/failures";
import { exportTasksAsCsv, exportTasksAsJson, exportHuggingFaceJsonl } from "@/lib/bench/export";

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState<Task | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetch("/bench/tasks.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setTasks)
      .catch(() => setFailed(true));
  }, []);

  const failureIds = useMemo(() => new Set(Object.keys(FAILURE_DEEP_DIVES)), []);

  const shown = useMemo(() => {
    if (!tasks) return [];
    if (kind === "all") return tasks;
    if (kind === "failures") return tasks.filter((t) => failureIds.has(t.id));
    return tasks.filter((t) => t.kind === kind);
  }, [tasks, kind, failureIds]);

  if (failed)
    return (
      <p className="text-zinc-400">
        No tasks found. Run <code className="text-zinc-200">npm run bench:generate</code> first.
      </p>
    );

  if (!tasks) return <p className="text-zinc-500">Loading tasks…</p>;

  if (open) {
    const currentIndex = shown.findIndex((t) => t.id === open.id);
    const onPrev = currentIndex > 0 ? () => setOpen(shown[currentIndex - 1]) : undefined;
    const onNext = currentIndex >= 0 && currentIndex < shown.length - 1 ? () => setOpen(shown[currentIndex + 1]) : undefined;

    return (
      <TaskComparisonView
        task={open}
        onBack={() => setOpen(null)}
        onPrev={onPrev}
        onNext={onNext}
      />
    );
  }

  const kinds = [
    { id: "all", label: "All tasks" },
    { id: "failures", label: `Failures (${failureIds.size})` },
    ...Array.from(new Set(tasks.map((t) => t.kind))).map((k) => ({ id: k, label: k })),
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Filter and Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {kinds.map((k) => {
            const isSelected = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {k.label}
              </button>
            );
          })}
          <span className="ml-2 font-mono text-xs text-zinc-500">{shown.length} tasks</span>
        </div>

        {/* 1-Click Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExportMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span>Export benchmark</span>
            <span className="text-[10px] text-zinc-500">▼</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-md border border-white/10 bg-[#0e0f13] p-1 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  exportTasksAsJson(tasks);
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span>Export JSON</span>
                <span className="font-mono text-[10px] text-zinc-500">.json</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTasksAsCsv(tasks);
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span>Export CSV (Pandas)</span>
                <span className="font-mono text-[10px] text-zinc-500">.csv</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportHuggingFaceJsonl(tasks);
                  setShowExportMenu(false);
                }}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span>Hugging Face Dataset</span>
                <span className="font-mono text-[10px] text-zinc-500">.jsonl</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Tasks */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => {
          const isFailure = failureIds.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpen(t)}
              className="group overflow-hidden rounded-lg border border-white/10 bg-[#0e0f13] text-left transition-colors hover:border-white/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={t.question} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-accent">{TIER_LABEL[t.tier]}</p>
                    {isFailure && (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] font-medium text-red-400">
                        Failed
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">{t.id}</span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-300">{t.question}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {t.difficulty.objects} obj · {t.difficulty.lighting} light
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
