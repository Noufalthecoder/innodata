"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Task, Vec } from "@/lib/bench/types";

interface StabilityOverlayProps {
  task: Task;
  showMeasurements?: boolean;
}

export function StabilityOverlay({ task, showMeasurements = true }: StabilityOverlayProps) {
  // Sort boxes from bottom to top by y-coordinate
  const { checks, isOverallStable } = useMemo(() => {
    const boxes = task.objects.slice().sort((a, b) => a.center[1] - b.center[1]);
    const computedChecks: {
      level: number;
      comX: number;
      comY: number;
      comZ: number;
      lo: number;
      hi: number;
      margin: number;
      isLevelStable: boolean;
      supportY: number;
      belowBox: (typeof boxes)[0];
    }[] = [];

    let overall = true;

    for (let i = boxes.length - 1; i >= 1; i--) {
      const above = boxes.slice(i);
      const comX = above.reduce((s, b) => s + b.center[0], 0) / above.length;
      const comY = above.reduce((s, b) => s + b.center[1], 0) / above.length;
      const comZ = above.reduce((s, b) => s + b.center[2], 0) / above.length;

      const below = boxes[i - 1];
      const halfW = below.size[0] / 2;
      const lo = below.center[0] - halfW;
      const hi = below.center[0] + halfW;
      const ok = comX >= lo && comX <= hi;
      const margin = Math.min(comX - lo, hi - comX);

      if (!ok) overall = false;

      computedChecks.push({
        level: i,
        comX,
        comY,
        comZ,
        lo,
        hi,
        margin,
        isLevelStable: ok,
        supportY: below.center[1] + below.size[1] / 2,
        belowBox: below,
      });
    }

    return { checks: computedChecks, isOverallStable: overall };
  }, [task.objects]);

  return (
    <group>
      {checks.map((chk) => {
        const { level, comX, comY, comZ, lo, hi, margin, isLevelStable, supportY, belowBox } = chk;
        const halfD = belowBox.size[2] / 2;
        const color = isLevelStable ? "#10b981" : "#ef4444";

        // Support Polygon corners on top of belowBox
        const p1: Vec = [lo, supportY + 0.005, -halfD];
        const p2: Vec = [hi, supportY + 0.005, -halfD];
        const p3: Vec = [hi, supportY + 0.005, halfD];
        const p4: Vec = [lo, supportY + 0.005, halfD];

        return (
          <group key={level}>
            {/* Supporting Face Perimeter Polygon */}
            <Line
              points={[p1, p2, p3, p4, p1]}
              color={color}
              lineWidth={2.5}
            />

            {/* Supporting Face Contact Area Tint */}
            <mesh position={[belowBox.center[0], supportY + 0.004, belowBox.center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[belowBox.size[0], belowBox.size[2]]} />
              <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>

            {/* Center of Mass Sphere in 3D */}
            <mesh position={[comX, comY, comZ]}>
              <sphereGeometry args={[0.1, 24, 24]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                roughness={0.2}
              />
            </mesh>

            {/* Vertical Plumb Line / Gravity Drop Line from COM to supporting surface */}
            <Line
              points={[[comX, comY, comZ], [comX, supportY, comZ]]}
              color={color}
              lineWidth={3}
            />

            {/* Contact Point Marker on Support Surface */}
            <mesh position={[comX, supportY + 0.008, comZ]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>

            {/* Margin and COM Readout Badge */}
            {showMeasurements && (
              <Html position={[comX, comY + 0.25, comZ + 0.3]} center>
                <div
                  className={`flex flex-col whitespace-nowrap rounded px-2 py-1 shadow-xl backdrop-blur transition-all ${
                    isLevelStable
                      ? "border border-emerald-500/70 bg-emerald-950/90 text-emerald-300"
                      : "border border-red-500/70 bg-red-950/90 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${isLevelStable ? "bg-emerald-400" : "bg-red-400 animate-ping"}`} />
                    <span>L{level} COM: x = {comX.toFixed(2)} m</span>
                  </div>
                  <div className="text-[9px] text-zinc-300">
                    Support: [{lo.toFixed(2)} to {hi.toFixed(2)}] m
                  </div>
                  <div className="font-mono text-[9px] font-bold">
                    {margin >= 0 ? `+${margin.toFixed(2)} m margin (Pass)` : `${margin.toFixed(2)} m OVERHANG (Fails)`}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Stack Ground Truth Stability Indicator */}
      {showMeasurements && (
        <Html position={[0, 0.2, 2.2]} center>
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs font-semibold shadow-2xl backdrop-blur ${
              isOverallStable
                ? "border border-emerald-500/80 bg-emerald-950/95 text-emerald-300"
                : "border border-red-500/80 bg-red-950/95 text-red-300"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isOverallStable ? "bg-emerald-400" : "bg-red-400"}`} />
            <span>Stack Status: {isOverallStable ? "STABLE (Stands)" : "UNSTABLE (Falls)"}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
