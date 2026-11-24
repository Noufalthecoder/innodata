"use client";

import { useMemo, useState } from "react";
import type { Kind, Task } from "@/lib/bench/types";
import { modelLabel } from "@/lib/bench/labels";
import { modelMeta } from "@/lib/bench/modelProfiles";
import { FAILURE_NOTES } from "@/lib/bench/failures";
import { missCounts, modelInsight, taskVerdicts } from "@/lib/bench/insights";
import { useBenchData } from "./useBenchData";

interface Props {
  modelId: string;
  tasks: Task[];
  onBack: () => void;
  onInspectTask: (task: Task) => void;
}

const KINDS: { id: Kind; label: string }[] = [
  { id: "closer", label: "Depth · closest" },
  { id: "leftmost", label: "Position · left-most" },
  { id: "orientation", label: "Orientation" },
  { id: "stability", label: "Stability" },
];
const tone = (p: number) => (p >= 90 ? "#34d399" : p >= 70 ? "#a3e635" : p >= 50 ? "#fbbf24" : "#f87171");

export default function ModelDeepDiveView({ modelId, onBack, onInspectTask }: Props) {
  const { data, error } = useBenchData();
  const [filter, setFilter] = useState<"all" | Kind | "everyone">("all");
  const meta = modelMeta(modelId);

  const view = useMemo(() => {
    if (!data) return null;
    const file = data.files.find((f) => f.model === modelId);
    if (!file) return null;
    const ins = modelInsight(file, data.files, data.tasks);
    const others = data.files.map((f) => modelInsight(f, data.files, data.tasks));
    const avg = Object.fromEntries(KINDS.map((k) => [k.id, Math.round(others.reduce((a, o) => a + o.byKind[k.id].pct, 0) / others.length)])) as Record<Kind, number>;
    // chance level from the real tasks: the average of 1 / number of options
    const chance = Object.fromEntries(KINDS.map((k) => { const ts = data.tasks.filter((t) => t.kind === k.id); return [k.id, Math.round((ts.reduce((a, t) => a + 1 / t.options.length, 0) / Math.max(1, ts.length)) * 100)]; })) as Record<Kind, number>;
    const byId = new Map(data.tasks.map((t) => [t.id, t]));
    const misses = missCounts(data.files);
    const wrong = file.results.filter((r) => !r.error && !r.correct && byId.has(r.id)).map((r) => ({ r, task: byId.get(r.id)! }));
    return { ins, avg, chance, wrong, misses, allWrong: new Set(data.summary.allWrong), files: data.files, tasks: data.tasks };
  }, [data, modelId]);

  if (error) return <p className="text-red-300">Could not load results: {error}</p>;
  if (!view) return <p className="text-zinc-500">Loading {meta.name}…</p>;
  const { ins, avg, chance, wrong, misses, allWrong, files, tasks } = view;

  const shown = wrong.filter(({ task }) => (filter === "all" ? true : filter === "everyone" ? allWrong.has(task.id) : task.kind === filter));
  const chips: { id: typeof filter; label: string }[] = [
    { id: "all", label: `All (${wrong.length})` },
    ...KINDS.map((k) => ({ id: k.id, label: `${k.label} (${wrong.filter((w) => w.task.kind === k.id).length})` })),
    { id: "everyone", label: `Missed by every model (${wrong.filter((w) => allWrong.has(w.task.id)).length})` },
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/40 hover:text-white">
          ← Leaderboard
        </button>
        {[meta.company, meta.kind, meta.license].filter(Boolean).map((c) => (
          <span key={c} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-400">
            {c}
          </span>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end">
        <div>
          <p className="text-sm font-medium text-accent">
            Rank {ins.rank} of {ins.of}
          </p>
          <h2 className="mt-1 text-4xl font-semibold tracking-tight text-white">{meta.name}</h2>
        </div>
        <div className="flex flex-wrap items-end gap-8 lg:justify-end">
          <div>
            <p className="text-6xl font-semibold tracking-tight" style={{ color: tone(ins.overall.pct) }}>
              {ins.overall.pct}%
            </p>
            <p className="text-sm text-zinc-500">
              {ins.overall.correct} of {ins.overall.n} tasks correct
            </p>
          </div>
        </div>
        <p className="max-w-4xl text-lg leading-relaxed text-zinc-300 lg:col-span-2">{ins.headline}</p>
      </div>

      {/* skill bars */}
      <section className="rounded-xl border border-white/10 bg-[#0e0f13] p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-white">Accuracy by skill</h3>
          <p className="text-xs text-zinc-500">
            <span className="mr-3 inline-flex items-center gap-1.5"><span className="h-3 w-px bg-zinc-400" />chance</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 border border-white/60" />average of all {ins.of} models</span>
          </p>
        </div>
        <div className="space-y-4">
          {KINDS.map((k) => {
            const r = ins.byKind[k.id];
            return (
              <div key={k.id} className="grid grid-cols-[150px_1fr_90px] items-center gap-4 text-sm sm:grid-cols-[190px_1fr_110px]">
                <span className="text-zinc-300">{k.label}</span>
                <div className="relative h-3 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r.pct}%`, background: tone(r.pct) }} />
                  <span className="absolute -top-1 h-5 w-px bg-zinc-400" style={{ left: `${chance[k.id]}%` }} title={`chance ${chance[k.id]}%`} />
                  <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/70 bg-ink" style={{ left: `${avg[k.id]}%` }} title={`average ${avg[k.id]}%`} />
                </div>
                <span className="text-right font-mono text-zinc-200">
                  {r.pct}% <span className="text-zinc-600">{r.correct}/{r.n}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* diagnostics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#0e0f13] p-6">
          <h3 className="font-semibold text-white">Stability: which way does it err?</h3>
          <p className="mt-1 text-sm text-zinc-500">Stacks that truly stand vs. stacks that truly fall.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: "Stable stacks recognised", a: ins.stability.standsRecognised, n: ins.stability.stands },
              { label: "Unstable stacks caught", a: ins.stability.fallsCaught, n: ins.stability.falls },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-white/[0.06] bg-black/30 p-4">
                <p className="text-3xl font-semibold" style={{ color: tone((c.a / Math.max(1, c.n)) * 100) }}>
                  {c.a}/{c.n}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{c.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-400">
            {ins.stability.fallsCaught - ins.stability.standsRecognised >= 3
              ? "Errs toward “it falls”: safe stacks get flagged, a false-alarm bias."
              : ins.stability.standsRecognised - ins.stability.fallsCaught >= 3
                ? "Errs toward “it stands”: some unsafe stacks pass."
                : "No strong bias in either direction."}
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#0e0f13] p-6">
          <h3 className="font-semibold text-white">Orientation: what it answers vs. the true answer</h3>
          <p className="mt-1 text-sm text-zinc-500">How often each direction was chosen, across {ins.byKind.orientation.n} tasks.</p>
          <div className="mt-5 space-y-3">
            {["Toward the camera", "Away from the camera", "To the left in the image", "To the right in the image"].map((o) => {
              const said = ins.orientation.picks.find((p) => p.option === o)?.count ?? 0;
              const truth = ins.orientation.truth.find((p) => p.option === o)?.count ?? 0;
              const n = Math.max(1, ins.byKind.orientation.n);
              return (
                <div key={o} className="grid grid-cols-[150px_1fr] items-center gap-3 text-sm">
                  <span className="text-zinc-300">{o.replace(" in the image", "")}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${(said / n) * 100}%`, minWidth: said ? 6 : 0 }} />
                      <span className="text-xs text-zinc-400">answered {said}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-emerald-500/60" style={{ width: `${(truth / n) * 100}%`, minWidth: truth ? 6 : 0 }} />
                      <span className="text-xs text-zinc-500">true answer in {truth}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* computed findings */}
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-[#0e0f13] p-6">
          <h3 className="font-semibold text-white">Findings</h3>
          <ul className="mt-4 space-y-3">
            {ins.findings.map((f) => (
              <li key={f} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-600">Computed from this model&apos;s stored answers. No figure on this page is typed by hand.</p>
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Strengths</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-emerald-100/90">{ins.strengths.length ? ins.strengths.map((s) => <li key={s}>✓ {s}</li>) : <li className="text-zinc-500">No skill at 90% or above</li>}</ul>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400">Blind spots</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-amber-100/90">{ins.weaknesses.length ? ins.weaknesses.map((s) => <li key={s}>⚠ {s}</li>) : <li className="text-zinc-500">No skill at 50% or below</li>}</ul>
          </div>
        </div>
      </section>

      {/* error gallery */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">Every task {meta.name} got wrong</h3>
            <p className="mt-1 text-sm text-zinc-500">Each card shows how all {files.length} models did on the same scene.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${filter === c.id ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-10 text-center text-sm text-zinc-500">No errors in this group.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(({ r, task }) => {
              const verdicts = taskVerdicts(task.id, files, tasks);
              const missed = misses.get(task.id) ?? 0;
              const note = FAILURE_NOTES[task.id];
              return (
                <article key={task.id} className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0f13] transition-colors hover:border-white/25">
                  <div className="relative aspect-[4/3] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={task.image} alt={task.question} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] text-zinc-300">{task.id}</span>
                    <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[11px] font-medium ${missed === files.length ? "bg-red-500/85 text-white" : "bg-black/70 text-zinc-300"}`}>
                      {missed === files.length ? `Missed by all ${files.length}` : `Missed by ${missed} of ${files.length}`}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <p className="text-sm font-medium text-white">{task.question}</p>
                    <div className="space-y-1 rounded-md bg-black/30 p-2.5 text-xs">
                      <p className="flex justify-between gap-2"><span className="text-zinc-500">This model</span><span className="text-right text-red-400">{r.choice === null ? "no answer" : task.options[r.choice]} ✕</span></p>
                      <p className="flex justify-between gap-2"><span className="text-zinc-500">Computed truth</span><span className="text-right text-emerald-400">{task.options[task.answer]} ✓</span></p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {verdicts.map((v) => (
                        <span key={v.model} title={`${modelLabel(v.model)}: ${v.answer}`} className={`rounded px-1.5 py-0.5 text-[10px] ${v.correct ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                          {modelMeta(v.model).name.split(" ").slice(0, 2).join(" ")} {v.correct ? "✓" : "✕"}
                        </span>
                      ))}
                    </div>
                    {note ? (
                      <p className="text-xs leading-relaxed text-zinc-400">
                        <span className="font-medium text-zinc-200">{note.title}.</span> <span className="text-zinc-500">Likely cause (our hypothesis):</span> {note.likelyCause}
                      </p>
                    ) : (
                      <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{task.explanation}</p>
                    )}
                    <button onClick={() => onInspectTask(task)} className="mt-auto rounded-md border border-white/15 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/40 hover:text-white">
                      Inspect in 3D →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
