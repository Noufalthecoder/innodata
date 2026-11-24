"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TIER_LABEL, type Task } from "@/lib/bench/types";

const SpatialSceneViewer = dynamic(() => import("./SpatialSceneViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-[4/3] place-items-center rounded-xl border border-white/10 bg-[#090b10] text-sm text-zinc-500">
      Loading 3D Scene…
    </div>
  ),
});

interface TaskComparisonViewProps {
  task: Task;
  onBack?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function TaskComparisonView({
  task,
  onBack,
  onNext,
  onPrev,
}: TaskComparisonViewProps) {
  const [imageZoomed, setImageZoomed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              ← Back to Grid
            </button>
          )}
          <span className="rounded bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
            {TIER_LABEL[task.tier]}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            ID: <strong className="text-white">{task.id}</strong> (Seed {task.seed})
          </span>
        </div>

        {(onPrev || onNext) && (
          <div className="flex items-center gap-2">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Previous
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Side-by-Side Comparison Workspace */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* LEFT COLUMN: Blender Photorealistic Render & Benchmark Question */}
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.image}
              alt={task.question}
              width={task.width}
              height={task.height}
              className={`w-full object-cover transition-transform duration-300 ${
                imageZoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in"
              }`}
              onClick={() => setImageZoomed(!imageZoomed)}
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[11px] text-zinc-300 shadow backdrop-blur">
              Blender Path-Traced Render (Model Input)
            </div>
            <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] text-zinc-400 backdrop-blur">
              Click to {imageZoomed ? "reset" : "zoom"}
            </div>
          </div>

          {/* Task Question & Options Card */}
          <div className="rounded-xl border border-white/10 bg-[#0e1017] p-5 shadow-xl">
            <h3 className="text-xl font-semibold tracking-tight text-white">{task.question}</h3>

            <div className="mt-4 space-y-2">
              {task.options.map((opt, idx) => {
                const isCorrect = idx === task.answer;
                return (
                  <div
                    key={opt}
                    className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                      isCorrect
                        ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/40"
                        : "border-white/10 bg-white/5 text-zinc-400"
                    }`}
                  >
                    <span>{opt}</span>
                    {isCorrect && (
                      <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Ground Truth
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation Breakdown */}
            <div className="mt-5 border-t border-white/10 pt-4">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Mathematical Ground Truth Derivation
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{task.explanation}</p>
            </div>

            {/* Visibility Quality Gate */}
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500">Quality Check:</span>
                <span className="font-mono text-xs text-emerald-400">Visibility Passed</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                {task.visibility.map((v) => (
                  <span key={v.object} className="rounded bg-black/40 px-2 py-0.5 border border-white/5 font-mono">
                    {v.object}: {v.visiblePct}% ({v.pixels.toLocaleString()} px)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive 3D Reconstruction & Ground Truth Inspector */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <SpatialSceneViewer task={task} allowTruth autoRotate={false} />
          </div>

          {/* 3D Viewer Operational Guide */}
          <div className="rounded-xl border border-white/10 bg-[#0e1017] p-4 text-xs text-zinc-400 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-mono font-semibold uppercase tracking-wider text-zinc-300">
                3D Inspection Controls
              </span>
              <span className="font-mono text-[11px] text-sky-400">Live Spatial Reconstruction</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500">Orbit / Rotate:</span> <span className="text-zinc-300">Left-click + Drag</span>
              </div>
              <div>
                <span className="text-zinc-500">Pan / Move:</span> <span className="text-zinc-300">Right-click + Drag</span>
              </div>
              <div>
                <span className="text-zinc-500">Zoom:</span> <span className="text-zinc-300">Mouse Wheel</span>
              </div>
              <div>
                <span className="text-zinc-500">Inspect Object:</span> <span className="text-zinc-300">Click 3D Mesh</span>
              </div>
            </div>

            <div className="mt-3 rounded border border-white/5 bg-black/40 p-2.5 text-zinc-400 text-[11px] leading-relaxed">
              <strong className="text-zinc-300 font-medium">Camera Modes:</strong> Switch between{" "}
              <code className="text-sky-300 font-mono">Camera POV</code> (exact model viewpoint) and{" "}
              <code className="text-sky-300 font-mono">Free Orbit</code> (overview mode where the benchmark camera rig and frustum are visible in 3D).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
