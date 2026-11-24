"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Task, Vec } from "@/lib/bench/types";

interface OrientationOverlayProps {
  task: Task;
  showMeasurements?: boolean;
}

export function OrientationOverlay({ task, showMeasurements = true }: OrientationOverlayProps) {
  const container = task.objects[0];
  const rotY = container?.rotY ?? 0;

  const { facing, tip, degrees, quadrantName } = useMemo(() => {
    const f: Vec = [Math.sin(rotY), 0, Math.cos(rotY)];
    const len = 2.8;
    const t: Vec = [f[0] * len, 0.55, f[2] * len];
    const deg = ((rotY * 180) / Math.PI + 360) % 360;
    const answerText = task.options[task.answer] ?? "";
    return { facing: f, tip: t, degrees: deg, quadrantName: answerText };
  }, [rotY, task]);

  // Compass ring segments and axes
  const cardinalLines = useMemo(() => {
    const R = 3.2;
    return [
      { name: "Toward camera (+Z)", from: [0, 0.02, 0], to: [0, 0.02, R], isAnswer: task.answer === 0 },
      { name: "Away from camera (-Z)", from: [0, 0.02, 0], to: [0, 0.02, -R], isAnswer: task.answer === 1 },
      { name: "Left in image (-X)", from: [0, 0.02, 0], to: [-R, 0.02, 0], isAnswer: task.answer === 2 },
      { name: "Right in image (+X)", from: [0, 0.02, 0], to: [R, 0.02, 0], isAnswer: task.answer === 3 },
    ] as { name: string; from: Vec; to: Vec; isAnswer: boolean }[];
  }, [task.answer]);

  return (
    <group>
      {/* Compass Circular Base on Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[2.75, 2.8, 64]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.6} />
      </mesh>

      {/* 4 Cardinal Direction Reference Rays */}
      {cardinalLines.map((axis, idx) => (
        <group key={idx}>
          <Line
            points={[axis.from, axis.to]}
            color={axis.isAnswer ? "#10b981" : "#64748b"}
            lineWidth={axis.isAnswer ? 2.5 : 1}
            dashed={!axis.isAnswer}
            dashSize={0.2}
            gapSize={0.15}
          />
          <Html position={[axis.to[0] * 1.12, 0.1, axis.to[2] * 1.12]} center>
            <div
              className={`whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] shadow-md backdrop-blur transition-all ${
                axis.isAnswer
                  ? "border border-emerald-500/70 bg-emerald-950/90 font-semibold text-emerald-300"
                  : "border border-white/10 bg-slate-900/80 text-slate-400"
              }`}
            >
              {axis.name}
            </div>
          </Html>
        </group>
      ))}

      {/* Primary Orientation Facing Vector (Thick Vector Arrow) */}
      <Line points={[[0, 0.55, 0], tip]} color="#f59e0b" lineWidth={4} />

      {/* 3D Arrow Cone Head */}
      <mesh position={tip} rotation={[Math.PI / 2, 0, -rotY + Math.PI]}>
        <coneGeometry args={[0.18, 0.42, 24]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.2} emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>

      {/* Angle Readout & Ground Truth Tag */}
      {showMeasurements && (
        <Html position={[tip[0] * 1.05, 0.95, tip[2] * 1.05]} center>
          <div className="flex flex-col items-center gap-1 rounded-md border border-amber-500/40 bg-black/90 p-2 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-300">Open Side</span>
            </div>
            <div className="text-[11px] text-zinc-300">
              Yaw: <span className="font-mono text-white font-medium">{degrees.toFixed(1)}°</span>
            </div>
            <div className="rounded border border-emerald-500/60 bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Matches: {quadrantName}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
