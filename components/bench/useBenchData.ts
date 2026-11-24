"use client";

import { useEffect, useState } from "react";
import { resultFileName, type ResultFile } from "@/lib/bench/insights";
import type { Task } from "@/lib/bench/types";

export type Acc = { n: number; correct: number; accuracy: number };
export type ModelSummary = { provider: string; model: string; overall: Acc; errors: number; byTier: Record<string, Acc>; byKind: Record<string, Acc>; byObjects: Record<string, Acc>; byLighting: Record<string, Acc> };
export type Summary = { generated: string; taskCount: number; models: ModelSummary[]; allWrong: string[] };
export type BenchData = { summary: Summary; tasks: Task[]; files: ResultFile[] };

/** one shared load per page: summary, tasks, and the results file of every model in the summary */
let pending: Promise<BenchData> | null = null;
function load(): Promise<BenchData> {
  pending ??= (async () => {
    const [summary, tasks] = await Promise.all([
      fetch("/bench/summary.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("no summary")))) as Promise<Summary>,
      fetch("/bench/tasks.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error("no tasks")))) as Promise<Task[]>,
    ]);
    const files = await Promise.all(summary.models.map((m) => fetch(`/bench/results/${resultFileName(m.model)}`).then((r) => r.json() as Promise<ResultFile>)));
    return { summary, tasks, files };
  })().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}

export function useBenchData() {
  const [data, setData] = useState<BenchData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    load()
      .then((d) => live && setData(d))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, []);
  return { data, error };
}
