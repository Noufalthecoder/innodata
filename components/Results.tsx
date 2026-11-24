"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal, SectionHead } from "./Section";

type Acc = { n: number; correct: number; accuracy: number };
type ModelSummary = { provider: string; model: string; overall: Acc; errors: number; byTier: Record<string, Acc>; byLighting: Record<string, Acc> };
type Summary = { taskCount: number; models: ModelSummary[]; allWrong: string[] };
type TaskLite = { id: string; image: string; question: string; options: string[]; answer: number; tier: number };

const LABEL: Record<string, string> = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemma-4-26b-a4b-it": "Gemma 4 26B (open weights)",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3-flash-preview": "Gemini 3 Flash",
};

const pct = (a?: Acc) => (a && a.n ? `${Math.round(a.accuracy * 100)}%` : "n/a");

export default function Results() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<Map<string, TaskLite>>(new Map());

  useEffect(() => {
    fetch("/bench/summary.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setSummary).catch(() => {});
    fetch("/bench/tasks.json").then((r) => (r.ok ? r.json() : [])).then((all: TaskLite[]) => setTasks(new Map(all.map((t) => [t.id, t])))).catch(() => {});
  }, []);

  const models = (summary?.models ?? []).slice().sort((a, b) => b.overall.accuracy - a.overall.accuracy);
  const failures = (summary?.allWrong ?? []).map((id) => tasks.get(id)).filter(Boolean).slice(0, 8) as TaskLite[];

  return (
    <section id="results" className="mx-auto max-w-6xl px-6 py-28">
      <SectionHead
        eyebrow="Leaderboard"
        title="Accuracy by model and tier"
        sub={models.length ? `Accuracy on ${summary!.taskCount} generated tasks. Every answer is scored automatically against computed ground truth.` : "Results appear here once models have been evaluated."}
      />

      {models.length > 0 && (
        <Reveal>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/10 text-zinc-500">
                <tr>
                  {["Model", "Overall", "Tier 1 · Pose", "Tier 2 · Relative", "Tier 3 · Stability", "Dim light"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {models.map((m) => (
                  <tr key={m.model}>
                    <td className="px-5 py-4 text-white">{LABEL[m.model] ?? m.model}</td>
                    <td className="px-5 py-4 font-semibold text-accent">{pct(m.overall)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier1)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier2)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byTier.tier3)}</td>
                    <td className="px-5 py-4 text-zinc-300">{pct(m.byLighting.dim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      {failures.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-white">Failure gallery</h3>
          <p className="mt-2 text-zinc-400">Scenes every evaluated model got wrong.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {failures.map((t) => (
              <Link key={t.id} href="/app#dataset" className="overflow-hidden rounded-lg border border-white/10 transition-colors hover:border-white/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={t.question} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <div className="p-4">
                  <p className="text-sm text-zinc-200">{t.question}</p>
                  <p className="mt-2 text-xs text-emerald-300">Ground truth: {t.options[t.answer]}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href="/app#leaderboard" className="mt-10 inline-block text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
        Full breakdown in the app →
      </Link>
    </section>
  );
}
