"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import type { SceneObject } from "@/lib/bench/types";

export const BENCH_COLORS: Record<string, string> = {
  red: "#e5484d",
  blue: "#5a8cff",
  teal: "#12a594",
  amber: "#f5a524",
  violet: "#a569e1",
  grey: "#aaacb8",
};

interface SceneObjectPrimitiveProps {
  object: SceneObject;
  materialType?: "matte" | "plastic" | "metal";
  isSelected?: boolean;
  isHighlighted?: boolean;
  highlightColor?: string;
  onSelect?: (obj: SceneObject) => void;
}

export function SceneObjectPrimitive({
  object,
  materialType = "matte",
  isSelected = false,
  isHighlighted = false,
  highlightColor,
  onSelect,
}: SceneObjectPrimitiveProps) {
  const [hovered, setHovered] = useState(false);
  const [w, h, d] = object.size;
  const pivot = object.pivot ?? object.center;
  const baseColor = BENCH_COLORS[object.color] ?? "#888888";

  const materialProps = useMemo(() => {
    const isMetal = materialType === "metal";
    const isPlastic = materialType === "plastic";
    return {
      color: baseColor,
      metalness: isMetal ? 0.85 : 0,
      roughness: isMetal ? 0.3 : isPlastic ? 0.25 : 0.65,
      emissive: isSelected
        ? new THREE.Color("#38bdf8")
        : isHighlighted
          ? new THREE.Color(highlightColor ?? "#10b981")
          : hovered
            ? new THREE.Color("#ffffff")
            : new THREE.Color("#000000"),
      emissiveIntensity: isSelected ? 0.45 : isHighlighted ? 0.4 : hovered ? 0.2 : 0,
    };
  }, [baseColor, materialType, isSelected, isHighlighted, highlightColor, hovered]);

  return (
    <group position={pivot} rotation={[0, object.rotY, 0]}>
      <mesh
        position={[object.center[0] - pivot[0], object.center[1] - pivot[1], object.center[2] - pivot[2]]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(object);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {object.shape === "box" && <boxGeometry args={[w, h, d]} />}
        {object.shape === "cylinder" && <cylinderGeometry args={[w / 2, w / 2, h, 64]} />}
        {object.shape === "sphere" && <sphereGeometry args={[w / 2, 64, 48]} />}
        {object.shape === "cone" && <coneGeometry args={[w / 2, h, 64]} />}
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}
