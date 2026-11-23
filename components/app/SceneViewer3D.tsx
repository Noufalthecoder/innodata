"use client";

import { ContactShadows, Environment, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import type { SceneObject, Task, Vec } from "@/lib/bench/types";

const COLORS: Record<string, string> = { red: "#e5484d", blue: "#5a8cff", teal: "#12a594", amber: "#f5a524", violet: "#a569e1", grey: "#aaacb8" };

const name = (o: SceneObject) => `${o.color} ${o.shape}`;
const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function Primitive({ o, material }: { o: SceneObject; material: "matte" | "plastic" | "metal" }) {
  const [w, h, d] = o.size;
  const pivot = o.pivot ?? o.center;
  const props = useMemo(() => ({ color: COLORS[o.color], metalness: material === "metal" ? 0.85 : 0, roughness: material === "metal" ? 0.3 : material === "plastic" ? 0.25 : 0.65 }), [o.color, material]);
  return (
    <group position={pivot} rotation={[0, o.rotY, 0]}>
      <mesh position={[o.center[0] - pivot[0], o.center[1] - pivot[1], o.center[2] - pivot[2]]} castShadow receiveShadow>
        {o.shape === "box" && <boxGeometry args={[w, h, d]} />}
        {o.shape === "cylinder" && <cylinderGeometry args={[w / 2, w / 2, h, 64]} />}
        {o.shape === "sphere" && <sphereGeometry args={[w / 2, 64, 48]} />}
        {o.shape === "cone" && <coneGeometry args={[w / 2, h, 64]} />}
        <meshStandardMaterial {...props} />
      </mesh>
    </group>
  );
}

/** Ground-truth overlays drawn from the same scene numbers the answer is computed from. */
function Overlays({ task }: { task: Task }) {
  const labels = useMemo(() => {
    const seen = new Map<number, SceneObject>();
    for (const o of task.objects) if (!seen.has(o.id)) seen.set(o.id, o);
    return Array.from(seen.values());
  }, [task]);

  if (task.kind === "closer") {
    return (
      <>
        {labels.map((o) => (
          <group key={o.id}>
            <Line points={[task.camera.pos, [o.center[0], o.center[1], o.center[2]]]} color="#ff8731" lineWidth={1.2} dashed dashSize={0.2} gapSize={0.15} />
            <Html position={[(o.center[0] + task.camera.pos[0]) / 2, (o.center[1] + task.camera.pos[1]) / 2 + 0.2, (o.center[2] + task.camera.pos[2]) / 2]} center>
              <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs text-orange-300">{dist(o.center, task.camera.pos).toFixed(2)} m</span>
            </Html>
          </group>
        ))}
      </>
    );
  }

  if (task.kind === "orientation") {
    const r = task.objects[0].rotY;
    const f: Vec = [Math.sin(r), 0, Math.cos(r)];
    const origin: Vec = [0, 0.6, 0];
    const tip: Vec = [f[0] * 2.6, 0.6, f[2] * 2.6];
    return (
      <>
        <Line points={[origin, tip]} color="#ff8731" lineWidth={3} />
        <mesh position={tip} rotation={[Math.PI / 2, 0, -r + Math.PI]}>
          <coneGeometry args={[0.12, 0.3, 16]} />
          <meshBasicMaterial color="#ff8731" />
        </mesh>
        <Html position={[tip[0] * 1.05, 0.9, tip[2] * 1.05]} center>
          <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs text-orange-300">open side</span>
        </Html>
      </>
    );
  }

  if (task.kind === "stability") {
    const boxes = task.objects.slice().sort((a, b) => a.center[1] - b.center[1]);
    const marks = [];
    for (let i = boxes.length - 1; i >= 1; i--) {
      const above = boxes.slice(i);
      const com = above.reduce((s, b) => s + b.center[0], 0) / above.length;
      const below = boxes[i - 1];
      const half = below.size[0] / 2;
      const ok = com >= below.center[0] - half && com <= below.center[0] + half;
      marks.push({ i, com, y: below.center[1] + below.size[1] / 2, lo: below.center[0] - half, hi: below.center[0] + half, ok, z: below.center[2] });
    }
    return (
      <>
        {marks.map((m) => (
          <group key={m.i}>
            <Line points={[[m.lo, m.y + 0.02, m.z + 0.8], [m.hi, m.y + 0.02, m.z + 0.8]]} color="#ffffff" lineWidth={3} />
            <mesh position={[m.com, m.y + 0.02, m.z + 0.8]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshBasicMaterial color={m.ok ? "#34d399" : "#f87171"} />
            </mesh>
            <Html position={[m.com, m.y + 0.3, m.z + 0.8]} center>
              <span className={`whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs ${m.ok ? "text-emerald-300" : "text-red-300"}`}>centre of mass, level {m.i}</span>
            </Html>
          </group>
        ))}
      </>
    );
  }

  // leftmost: name tags
  return (
    <>
      {labels.map((o) => (
        <Html key={o.id} position={[o.center[0], o.center[1] + o.size[1] / 2 + 0.25, o.center[2]]} center>
          <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs text-zinc-200">{name(o)}</span>
        </Html>
      ))}
    </>
  );
}

export default function SceneViewer3D({ task, allowTruth = true, autoRotate = false }: { task: Task; allowTruth?: boolean; autoRotate?: boolean }) {
  const [spin, setSpin] = useState(autoRotate);
  const [overlay, setOverlay] = useState(true);
  const [key, setKey] = useState(0); // remounts controls to reset the view
  const material = task.render?.material ?? "matte";
  const cam = task.camera;
  // start a little further back than the task camera so the whole scene is visible
  const start: Vec = [0, 1, 2].map((i) => cam.look[i] + (cam.pos[i] - cam.look[i]) * 1.45) as Vec;

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black" style={{ aspectRatio: `${task.width} / ${task.height}` }}>
      <Canvas key={key} shadows dpr={[1, 2]} camera={{ position: start, fov: cam.fov, near: 0.1, far: 200 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={["#0b0d14"]} />
        <fog attach="fog" args={["#0b0d14", 25, 70]} />
        <Environment files="/env/studio.hdr" environmentIntensity={task.difficulty.lighting === "dim" ? 0.25 : 0.9} />
        <directionalLight position={[5, 9, 4]} intensity={task.difficulty.lighting === "dim" ? 0.3 : 1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0004} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#3a3d4a" roughness={0.8} />
        </mesh>
        <gridHelper args={[60, 60, "#5a6080", "#2a2e40"]} position={[0, 0.002, 0]} />
        {task.objects.map((o, i) => (
          <Primitive key={i} o={o} material={material} />
        ))}
        <ContactShadows position={[0, 0.005, 0]} opacity={0.5} scale={30} blur={2.2} far={6} />
        {allowTruth && overlay && <Overlays task={task} />}
        <OrbitControls target={cam.look} enableDamping autoRotate={spin} autoRotateSpeed={0.9} onStart={() => setSpin(false)} maxPolarAngle={Math.PI / 2 - 0.02} />
      </Canvas>
      <div className="absolute left-3 top-3 flex gap-2">
        {allowTruth && (
          <button onClick={() => setOverlay((v) => !v)} className="rounded bg-black/70 px-3 py-1.5 text-xs text-white hover:bg-black/90">
            {overlay ? "Hide" : "Show"} ground truth
          </button>
        )}
        <button onClick={() => setKey((k) => k + 1)} className="rounded bg-black/70 px-3 py-1.5 text-xs text-white hover:bg-black/90">
          Reset view
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-2 right-3 text-xs text-zinc-400">Drag to rotate · scroll to zoom</p>
    </div>
  );
}
