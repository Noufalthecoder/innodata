"use client";

import { useState } from "react";

export interface ViewerControlsState {
  cameraMode: "benchmark" | "orbit";
  showOverlay: boolean;
  showMeasurements: boolean;
  showGridAxes: boolean;
  showLabels: boolean;
  autoRotate: boolean;
}

interface SceneControlsHUDProps {
  state: ViewerControlsState;
  onChange: (patch: Partial<ViewerControlsState>) => void;
  onResetCamera: () => void;
  allowTruth?: boolean;
}

export function SceneControlsHUD({
  state,
  onChange,
  onResetCamera,
  allowTruth = true,
}: SceneControlsHUDProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 flex flex-col gap-2">
      {/* Primary Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-black/80 p-1.5 shadow-2xl backdrop-blur-md">
        {/* Camera Mode Toggle */}
        <div className="flex rounded bg-white/5 p-0.5" role="group" aria-label="Camera perspective">
          <button
            type="button"
            onClick={() => onChange({ cameraMode: "benchmark" })}
            title="Benchmark Camera Perspective (Model POV)"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              state.cameraMode === "benchmark"
                ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Camera POV
          </button>
          <button
            type="button"
            onClick={() => onChange({ cameraMode: "orbit" })}
            title="Free 3D Orbit Inspection"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              state.cameraMode === "orbit"
                ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Free Orbit
          </button>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Reset Camera Button */}
        <button
          type="button"
          onClick={onResetCamera}
          title="Reset camera target and orientation"
          className="rounded px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          Reset
        </button>

        {/* Ground Truth Toggle */}
        {allowTruth && (
          <button
            type="button"
            onClick={() => onChange({ showOverlay: !state.showOverlay })}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              state.showOverlay
                ? "border border-emerald-500/50 bg-emerald-950/60 text-emerald-300"
                : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {state.showOverlay ? "Truth: ON" : "Truth: OFF"}
          </button>
        )}

        {/* Measurements Toggle */}
        <button
          type="button"
          onClick={() => onChange({ showMeasurements: !state.showMeasurements })}
          title="Toggle numerical measurement tags"
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            state.showMeasurements
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Measures
        </button>

        {/* Grid & Coordinate Axes Toggle */}
        <button
          type="button"
          onClick={() => onChange({ showGridAxes: !state.showGridAxes })}
          title="Toggle ground grid and coordinate axes"
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            state.showGridAxes ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          Grid
        </button>

        {/* Object Labels Toggle */}
        <button
          type="button"
          onClick={() => onChange({ showLabels: !state.showLabels })}
          title="Toggle object identity labels"
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            state.showLabels ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          Labels
        </button>
      </div>
    </div>
  );
}
