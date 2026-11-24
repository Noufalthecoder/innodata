"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { makeProjector, objectName } from "@/lib/bench/geometry";
import type { SceneObject, Task, Vec } from "@/lib/bench/types";

interface PositionOverlayProps {
  task: Task;
  selectedObjectId?: number | null;
  showMeasurements?: boolean;
}

export function PositionOverlay({ task, selectedObjectId, showMeasurements = true }: PositionOverlayProps) {
  const { camera, width, height } = task;

  // Project each object center to screen coordinates
  const { projectedObjects, leftmostId } = useMemo(() => {
    const P = makeProjector(camera, width, height);
    const seen = new Map<number, SceneObject>();
    for (const o of task.objects) if (!seen.has(o.id)) seen.set(o.id, o);
    const list = Array.from(seen.values());

    let minX = Infinity;
    let leftId = -1;

    const withProj = list.map((o) => {
      const proj = P(o.center); // [screenX, screenY, depth]
      const screenX = proj[0];
      if (screenX < minX) {
        minX = screenX;
        leftId = o.id;
      }
      return { object: o, screenX, screenY: proj[1], depth: proj[2] };
    });

    withProj.sort((a, b) => a.screenX - b.screenX);

    return { projectedObjects: withProj, leftmostId: leftId };
  }, [camera, width, height, task.objects]);

  // Construct horizontal baseline in front of the camera
  const { baselineStart, baselineEnd } = useMemo(() => {
    const f = new THREE.Vector3().subVectors(new THREE.Vector3(...camera.look), new THREE.Vector3(...camera.pos)).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(f, up).normalize();
    const centerPoint = new THREE.Vector3(...camera.pos).add(f.clone().multiplyScalar(4.0));
    const pLeft = centerPoint.clone().add(right.clone().multiplyScalar(-3.5));
    const pRight = centerPoint.clone().add(right.clone().multiplyScalar(3.5));
    return {
      baselineStart: [pLeft.x, pLeft.y, pLeft.z] as Vec,
      baselineEnd: [pRight.x, pRight.y, pRight.z] as Vec,
    };
  }, [camera]);

  return (
    <group>
      {/* Horizontal Camera View Baseline */}
      <Line points={[baselineStart, baselineEnd]} color="#64748b" lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />

      {/* Projection rays and badges */}
      {projectedObjects.map(({ object, screenX }, rank) => {
        const isLeftmost = object.id === leftmostId;
        const isSelected = selectedObjectId === object.id;

        return (
          <group key={object.id}>
            {/* Projection line from camera through object */}
            <Line
              points={[camera.pos, object.center]}
              color={isLeftmost ? "#10b981" : isSelected ? "#38bdf8" : "#64748b"}
              lineWidth={isLeftmost ? 2.5 : isSelected ? 2.0 : 1.0}
              dashed={!isLeftmost}
              dashSize={0.2}
              gapSize={0.15}
            />

            {/* Screen-X Projection Tag */}
            {showMeasurements && (
              <Html position={[object.center[0], object.center[1] + object.size[1] / 2 + 0.35, object.center[2]]} center>
                <div
                  className={`flex flex-col items-center whitespace-nowrap rounded px-2 py-1 shadow-lg backdrop-blur transition-all ${
                    isLeftmost
                      ? "border border-emerald-500/80 bg-emerald-950/95 font-semibold text-emerald-300 ring-2 ring-emerald-500/30"
                      : isSelected
                        ? "border border-sky-500/80 bg-sky-950/95 text-sky-200"
                        : "border border-white/15 bg-black/85 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {isLeftmost && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                    <span>{objectName(object)}</span>
                    <span className="font-mono text-[10px] text-zinc-400">#{rank + 1}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px]">
                    proj X: <span className={isLeftmost ? "font-bold text-emerald-300" : "text-white"}>{screenX.toFixed(0)} px</span>
                    {isLeftmost && <span className="ml-1 text-[9px] font-semibold uppercase text-emerald-400">· Furthest Left</span>}
                  </div>
                </div>
              </Html>
            )}

            {/* Leftmost highlight floor disk */}
            {isLeftmost && (
              <mesh position={[object.center[0], 0.02, object.center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[object.size[0] / 2 + 0.1, object.size[0] / 2 + 0.22, 48]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
