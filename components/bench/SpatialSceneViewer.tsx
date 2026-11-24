"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject, Task, Vec } from "@/lib/bench/types";
import { objectName } from "@/lib/bench/geometry";
import { SceneObjectPrimitive } from "./SceneObjectPrimitive";
import { SceneCameraRig, VirtualCameraHelper } from "./SceneCameraRig";
import { SceneControlsHUD, type ViewerControlsState } from "./SceneControlsHUD";
import { ObjectInspectorPanel } from "./ObjectInspectorPanel";
import { OrientationOverlay } from "./overlays/OrientationOverlay";
import { DepthOverlay } from "./overlays/DepthOverlay";
import { PositionOverlay } from "./overlays/PositionOverlay";
import { StabilityOverlay } from "./overlays/StabilityOverlay";

interface SpatialSceneViewerProps {
  task: Task;
  allowTruth?: boolean;
  autoRotate?: boolean;
  className?: string;
}

export default function SpatialSceneViewer({
  task,
  allowTruth = true,
  autoRotate = false,
  className,
}: SpatialSceneViewerProps) {
  const [controlsState, setControlsState] = useState<ViewerControlsState>({
    cameraMode: "orbit",
    showOverlay: true,
    showMeasurements: true,
    showGridAxes: true,
    showLabels: true,
    autoRotate,
  });

  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const materialType = task.render?.material ?? "matte";
  const isDim = task.difficulty.lighting === "dim";

  const uniqueObjects = useMemo(() => {
    const map = new Map<number, SceneObject>();
    for (const o of task.objects) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return Array.from(map.values());
  }, [task.objects]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#090b10] ${className ?? ""}`}
      style={{ aspectRatio: `${task.width} / ${task.height}` }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: task.camera.pos,
          fov: task.camera.fov,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onClick={() => setSelectedObject(null)}
      >
        <color attach="background" args={["#08090d"]} />
        <fog attach="fog" args={["#08090d", 28, 80]} />

        {/* Lighting & Environment */}
        <Environment files="/env/studio.hdr" environmentIntensity={isDim ? 0.25 : 0.9} />
        <ambientLight intensity={isDim ? 0.2 : 0.6} />
        <directionalLight
          position={[5, 9, 4]}
          intensity={isDim ? 0.35 : 1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0004}
        />

        {/* Studio Floor Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#1e2230" roughness={0.85} metalness={0.1} />
        </mesh>

        {/* Ground Grid & Axes */}
        {controlsState.showGridAxes && (
          <group>
            <gridHelper args={[60, 60, "#3b4261", "#1a1d29"]} position={[0, 0.002, 0]} />
            <axesHelper args={[2.5]} position={[0, 0.005, 0]} />
          </group>
        )}

        {/* Scene Objects */}
        {task.objects.map((o, idx) => (
          <SceneObjectPrimitive
            key={`${o.id}-${idx}`}
            object={o}
            materialType={materialType}
            isSelected={selectedObject?.id === o.id}
            onSelect={(obj) => setSelectedObject(obj)}
          />
        ))}

        {/* Object Name Labels */}
        {controlsState.showLabels &&
          uniqueObjects.map((o) => (
            <Html key={`lbl-${o.id}`} position={[o.center[0], o.center[1] + o.size[1] / 2 + 0.2, o.center[2]]} center>
              <div className="pointer-events-none whitespace-nowrap rounded border border-white/10 bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 shadow backdrop-blur">
                {objectName(o)}
              </div>
            </Html>
          ))}

        {/* Virtual Benchmark Camera Frustum in Orbit Mode */}
        {controlsState.cameraMode === "orbit" && (
          <VirtualCameraHelper cameraConfig={task.camera} aspect={task.width / task.height} />
        )}

        {/* Ground-Truth Overlays */}
        {allowTruth && controlsState.showOverlay && (
          <>
            {task.kind === "closer" && (
              <DepthOverlay
                task={task}
                selectedObjectId={selectedObject?.id}
                showMeasurements={controlsState.showMeasurements}
              />
            )}
            {task.kind === "orientation" && (
              <OrientationOverlay
                task={task}
                showMeasurements={controlsState.showMeasurements}
              />
            )}
            {task.kind === "leftmost" && (
              <PositionOverlay
                task={task}
                selectedObjectId={selectedObject?.id}
                showMeasurements={controlsState.showMeasurements}
              />
            )}
            {task.kind === "stability" && (
              <StabilityOverlay
                task={task}
                showMeasurements={controlsState.showMeasurements}
              />
            )}
          </>
        )}

        {/* Contact Shadows for Realism */}
        <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={30} blur={2.0} far={6} />

        {/* Camera Rig & Controls */}
        <SceneCameraRig
          cameraConfig={task.camera}
          cameraMode={controlsState.cameraMode}
          autoRotate={controlsState.autoRotate}
          resetSignal={resetKey}
        />
      </Canvas>

      {/* Floating HUD Controls */}
      <SceneControlsHUD
        state={controlsState}
        onChange={(patch) => setControlsState((prev) => ({ ...prev, ...patch }))}
        onResetCamera={() => setResetKey((k) => k + 1)}
        allowTruth={allowTruth}
      />

      {/* Selected Object Inspector */}
      <ObjectInspectorPanel
        object={selectedObject}
        task={task}
        onClose={() => setSelectedObject(null)}
      />

      {/* Top Right Task Status Badge */}
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
        <span className="rounded-md border border-white/10 bg-black/70 px-2.5 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur">
          {task.id} · {task.kind.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
