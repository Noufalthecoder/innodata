"use client";

import { useState } from "react";
import { TIER_LABEL, type Task } from "@/lib/bench/types";

/** Shows one task. Interactive: the visitor answers first, then sees ground truth. Static: answer is shown at once. */
export default function TaskPanel({ task, interactive = true, onAnswered, extra }: { task: Task; interactive?: boolean; onAnswered?: (correct: boolean) => void; extra?: React.ReactNode }) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = !interactive || picked !== null;

  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    onAnswered?.(k === task.answer);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={task.image} alt={task.question} width={task.width} height={task.height} className="h-auto w-full rounded-lg border border-white/10" />
        <p className="mt-3 text-sm text-zinc-500">
          {task.id} · {task.difficulty.objects} object{task.difficulty.objects > 1 ? "s" : ""} · {task.difficulty.lighting} light · seed {task.seed}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-accent">{TIER_LABEL[task.tier]}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{task.question}</h3>

        <div className="mt-6 space-y-3" role="group" aria-label="Answer options">
          {task.options.map((o, k) => {
            const correct = k === task.answer;
            const state = !revealed
              ? "border-white/15 text-zinc-200 hover:border-white/50"
              : correct
                ? "border-emerald-400/70 bg-emerald-400/10 text-white"
                : k === picked
                  ? "border-red-400/70 bg-red-400/10 text-white"
                  : "border-white/10 text-zinc-500";
            return (
              <button key={o} onClick={() => choose(k)} disabled={revealed} className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${state}`}>
                <span>{o}</span>
                {revealed && correct && <span className="text-sm text-emerald-300">Ground truth</span>}
                {revealed && !correct && k === picked && <span className="text-sm text-red-300">Your answer</span>}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-6 border-t border-white/10 pt-5">
            {interactive && <p className="font-medium text-white">{picked === task.answer ? "You got it." : "Not quite."}</p>}
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{task.explanation}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Visibility check</p>
            <ul className="mt-1 space-y-0.5 text-sm text-zinc-400">
              {task.visibility.map((v) => (
                <li key={v.object}>
                  {v.ok ? "Pass" : "Fail"} · {v.object}, {v.visiblePct}% visible, {v.pixels.toLocaleString()} px
                </li>
              ))}
            </ul>
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}
