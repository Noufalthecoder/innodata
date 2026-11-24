"use client";

import { useMemo, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { Camera as BenchmarkCamera, Vec } from "@/lib/bench/types";

interface SceneCameraRigProps {
  cameraConfig: BenchmarkCamera;
  cameraMode: "benchmark" | "orbit";
  autoRotate?: boolean;
  onControlsChange?: () => void;
  resetSignal?: number;
}

/** Virtual benchmark camera frustum and body in 3D space */
export function VirtualCameraHelper({
  cameraConfig,
  aspect = 4 / 3,
}: {
  cameraConfig: BenchmarkCamera;
  aspect?: number;
}) {
  const { pos, look, fov } = cameraConfig;

  const { frustumSegments, camBoxRotation } = useMemo(() => {
    const p = new THREE.Vector3(...pos);
    const l = new THREE.Vector3(...look);
    const forward = new THREE.Vector3().subVectors(l, p).normalize();

    // calculate frustum corners at distance d
    const dist = 3.2;
    const halfH = dist * Math.tan((fov * Math.PI) / 360);
    const halfW = halfH * aspect;

    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const realUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    const centerNear = new THREE.Vector3().addVectors(p, forward.clone().multiplyScalar(dist));
    const c0 = centerNear.clone().add(right.clone().multiplyScalar(-halfW)).add(realUp.clone().multiplyScalar(halfH));
    const c1 = centerNear.clone().add(right.clone().multiplyScalar(halfW)).add(realUp.clone().multiplyScalar(halfH));
    const c2 = centerNear.clone().add(right.clone().multiplyScalar(halfW)).add(realUp.clone().multiplyScalar(-halfH));
    const c3 = centerNear.clone().add(right.clone().multiplyScalar(-halfW)).add(realUp.clone().multiplyScalar(-halfH));

    const pVec: Vec = [pos[0], pos[1], pos[2]];
    const c0Vec: Vec = [c0.x, c0.y, c0.z];
    const c1Vec: Vec = [c1.x, c1.y, c1.z];
    const c2Vec: Vec = [c2.x, c2.y, c2.z];
    const c3Vec: Vec = [c3.x, c3.y, c3.z];

    const segs: [Vec, Vec][] = [
      [pVec, c0Vec],
      [pVec, c1Vec],
      [pVec, c2Vec],
      [pVec, c3Vec],
      [c0Vec, c1Vec],
      [c1Vec, c2Vec],
      [c2Vec, c3Vec],
      [c3Vec, c0Vec],
    ];

    const matrix = new THREE.Matrix4().lookAt(p, l, up);
    const rot = new THREE.Euler().setFromRotationMatrix(matrix);

    return { frustumSegments: segs, camBoxRotation: rot };
  }, [pos, look, fov, aspect]);

  return (
    <group>
      {/* Camera Body Rig */}
      <group position={pos} rotation={camBoxRotation}>
        <mesh position={[0, 0, 0.2]}>
          <boxGeometry args={[0.3, 0.22, 0.35]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.9} />
        </mesh>
      </group>

      {/* Frustum Ray Pyramids */}
      {frustumSegments.map(([start, end], i) => (
        <Line
          key={i}
          points={[start, end]}
          color="#38bdf8"
          lineWidth={1.2}
          transparent
          opacity={0.65}
        />
      ))}
    </group>
  );
}

export function SceneCameraRig({
  cameraConfig,
  cameraMode,
  autoRotate = false,
  resetSignal = 0,
}: SceneCameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Calculate overview initial position
  const overviewPos = useMemo<Vec>(() => {
    const cam = cameraConfig;
    return [0, 1, 2].map((i) => cam.look[i] + (cam.pos[i] - cam.look[i]) * 1.45) as Vec;
  }, [cameraConfig]);

  useEffect(() => {
    if (!controlsRef.current) return;
    if (cameraMode === "benchmark") {
      camera.position.set(...cameraConfig.pos);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = cameraConfig.fov;
        camera.updateProjectionMatrix();
      }
      controlsRef.current.target.set(...cameraConfig.look);
      controlsRef.current.update();
    } else {
      camera.position.set(...overviewPos);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = cameraConfig.fov;
        camera.updateProjectionMatrix();
      }
      controlsRef.current.target.set(...cameraConfig.look);
      controlsRef.current.update();
    }
  }, [cameraMode, cameraConfig, overviewPos, camera, resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={cameraConfig.look}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={1.0}
      maxDistance={40.0}
    />
  );
}
