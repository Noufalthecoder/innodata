"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject, Task, Vec } from "@/lib/bench/types";

interface DepthOverlayProps {
  task: Task;
  selectedObjectId?: number | null;
  showMeasurements?: boolean;
}

export function DepthOverlay({ task, selectedObjectId, showMeasurements = true }: DepthOverlayProps) {
  const camPos = task.camera.pos;

  // Compute unique objects and their Euclidean distance to camera
  const { objectDistances, nearestId, minDistance } = useMemo(() => {
    const seen = new Map<number, SceneObject>();
    for (const o of task.objects) if (!seen.has(o.id)) seen.set(o.id, o);
    const list = Array.from(seen.values());

    let minD = Infinity;
    let nearId = -1;

    const withD = list.map((o) => {
      const d = Math.hypot(o.center[0] - camPos[0], o.center[1] - camPos[1], o.center[2] - camPos[2]);
      if (d < minD) {
        minD = d;
        nearId = o.id;
      }
      return { object: o, dist: d };
    });

    return { objectDistances: withD, nearestId: nearId, minDistance: minD };
  }, [task.objects, camPos]);

  return (
    <group>
      {/* Concentric Ground Depth Reference Arcs from Camera Base */}
      {objectDistances.map(({ dist, object }) => {
        const isNearest = object.id === nearestId;
        return (
          <group key={`arc-${object.id}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[camPos[0], 0.015, camPos[2]]}>
              <ringGeometry args={[dist - 0.02, dist + 0.02, 64]} />
              <meshBasicMaterial
                color={isNearest ? "#10b981" : "#64748b"}
                transparent
                opacity={isNearest ? 0.6 : 0.25}
              />
            </mesh>
          </group>
        );
      })}

      {/* Measurement lines from camera to each object */}
      {objectDistances.map(({ object, dist }) => {
        const isNearest = object.id === nearestId;
        const isSelected = selectedObjectId === object.id;
        const mid: Vec = [
          (object.center[0] + camPos[0]) / 2,
          (object.center[1] + camPos[1]) / 2 + 0.25,
          (object.center[2] + camPos[2]) / 2,
        ];

        return (
          <group key={object.id}>
            {/* 3D Measurement Line */}
            <Line
              points={[camPos, object.center]}
              color={isNearest ? "#10b981" : isSelected ? "#38bdf8" : "#f59e0b"}
              lineWidth={isNearest ? 2.8 : isSelected ? 2.5 : 1.2}
              dashed={!isNearest}
              dashSize={0.25}
              gapSize={0.15}
            />

            {/* Depth Distance Floating Badge */}
            {showMeasurements && (
              <Html position={mid} center>
                <div
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 shadow-lg backdrop-blur transition-all ${
                    isNearest
                      ? "border border-emerald-500/80 bg-emerald-950/90 font-bold text-emerald-300 ring-2 ring-emerald-500/30"
                      : isSelected
                        ? "border border-sky-500/80 bg-sky-950/90 font-medium text-sky-200"
                        : "border border-amber-500/40 bg-black/80 font-mono text-xs text-amber-300"
                  }`}
                >
                  {isNearest && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  <span>{dist.toFixed(2)} m</span>
                  {isNearest && <span className="rounded bg-emerald-800/80 px-1 text-[9px] uppercase tracking-wider text-white">Nearest</span>}
                </div>
              </Html>
            )}

            {/* Nearest Object Ground Marker Ring */}
            {isNearest && (
              <mesh position={[object.center[0], 0.02, object.center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[object.size[0] / 2 + 0.15, object.size[0] / 2 + 0.25, 48]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
