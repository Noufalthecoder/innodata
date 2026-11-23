"use client";

import { useEffect, useMemo, useState } from "react";
import { TIER_LABEL, type Task } from "@/lib/bench/types";
import TaskPanel from "./TaskPanel";

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState<Task | null>(null);

  useEffect(() => {
    fetch("/bench/tasks.json").then((r) => (r.ok ? r.json() : Promise.reject())).then(setTasks).catch(() => setFailed(true));
  }, []);

  const shown = useMemo(() => (tasks ?? []).filter((t) => kind === "all" || t.kind === kind), [tasks, kind]);

  if (failed) return <p className="text-zinc-400">No tasks found. Run <code className="text-zinc-200">npm run bench:generate</code> first.</p>;
  if (!tasks) return <p className="text-zinc-500">Loading tasks…</p>;

  if (open)
    return (
      <div>
        <button onClick={() => setOpen(null)} className="mb-6 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
          ← Back to all tasks
        </button>
        <TaskPanel task={open} interactive={false} />
      </div>
    );

  const kinds = ["all", ...Array.from(new Set(tasks.map((t) => t.kind)))];
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {kinds.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${kind === k ? "border-accent text-accent" : "border-white/15 text-zinc-400 hover:text-white"}`}>
            {k}
          </button>
        ))}
        <span className="ml-auto text-sm text-zinc-500">{shown.length} tasks</span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => (
          <button key={t.id} onClick={() => setOpen(t)} className="group overflow-hidden rounded-lg border border-white/10 text-left transition-colors hover:border-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.image} alt={t.question} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-3">
              <p className="text-xs text-accent">{TIER_LABEL[t.tier]}</p>
              <p className="mt-1 truncate text-sm text-zinc-300">{t.question}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {t.id} · {t.difficulty.objects} obj · {t.difficulty.lighting}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
