"use client";

import type { SceneObject, Task, Vec } from "@/lib/bench/types";
import { makeProjector, objectName } from "@/lib/bench/geometry";

interface ObjectInspectorPanelProps {
  object: SceneObject | null;
  task: Task;
  onClose: () => void;
}

export function ObjectInspectorPanel({ object, task, onClose }: ObjectInspectorPanelProps) {
  if (!object) return null;

  const camPos = task.camera.pos;
  const dist = Math.hypot(
    object.center[0] - camPos[0],
    object.center[1] - camPos[1],
    object.center[2] - camPos[2]
  );

  const P = makeProjector(task.camera, task.width, task.height);
  const proj = P(object.center);
  const rotDeg = ((object.rotY * 180) / Math.PI + 360) % 360;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 w-72 rounded-lg border border-white/15 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: object.color }} />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
            {objectName(object)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between text-zinc-400">
          <span>Center [X, Y, Z]:</span>
          <span className="text-zinc-200">
            [{object.center.map((v) => v.toFixed(2)).join(", ")}] m
          </span>
        </div>

        <div className="flex justify-between text-zinc-400">
          <span>Dimensions [W, H, D]:</span>
          <span className="text-zinc-200">
            [{object.size.map((v) => v.toFixed(2)).join(", ")}] m
          </span>
        </div>

        <div className="flex justify-between text-zinc-400">
          <span>Yaw Rotation:</span>
          <span className="text-zinc-200">{rotDeg.toFixed(1)}°</span>
        </div>

        <div className="flex justify-between text-zinc-400">
          <span>Distance to Camera:</span>
          <span className="font-semibold text-emerald-400">{dist.toFixed(2)} m</span>
        </div>

        <div className="flex justify-between text-zinc-400">
          <span>Projected Screen X:</span>
          <span className="text-sky-300">{proj[0].toFixed(0)} px</span>
        </div>
      </div>
    </div>
  );
}
