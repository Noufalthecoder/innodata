"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/bench/types";
import TaskPanel from "./TaskPanel";

export default function PlayTab() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    fetch("/bench/tasks.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((all: Task[]) => {
        // a fixed, mixed order so every kind shows up early
        const byKind = new Map<string, Task[]>();
        for (const t of all) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);
        const mixed: Task[] = [];
        for (let k = 0; mixed.length < all.length; k++) for (const list of byKind.values()) if (list[k]) mixed.push(list[k]);
        setTasks(mixed);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-zinc-400">No tasks found. Run <code className="text-zinc-200">npm run bench:generate</code> first.</p>;
  if (!tasks) return <p className="text-zinc-500">Loading tasks…</p>;
  const t = tasks[i];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Task {i + 1} of {tasks.length}
        </span>
        <span>
          Score {score}/{played}
        </span>
      </div>
      <TaskPanel
        key={t.id}
        task={t}
        onAnswered={(ok) => {
          setAnswered(true);
          setPlayed((p) => p + 1);
          if (ok) setScore((s) => s + 1);
        }}
        extra={
          <button
            onClick={() => {
              setI((i + 1) % tasks.length);
              setAnswered(false);
            }}
            className="mt-6 rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90"
          >
            Next task
          </button>
        }
      />
      {!answered && <p className="mt-6 text-sm text-zinc-500">These are the same tasks the models are asked. Every answer is computed from the scene data.</p>}
    </div>
  );
}
