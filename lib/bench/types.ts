export type Vec = [number, number, number];
export type Shape = "box" | "cylinder" | "sphere" | "cone";
export type ColorName = "red" | "blue" | "teal" | "amber" | "violet" | "grey";
export type Kind = "closer" | "leftmost" | "orientation" | "stability";

/** size is [width, height, depth]; for round shapes width = depth = 2 * radius. */
export interface SceneObject {
  id: number;
  shape: Shape;
  color: ColorName;
  center: Vec;
  size: Vec;
  rotY: number;
  /** rotation pivot (used by composite objects such as the open container) */
  pivot?: Vec;
}

export interface Camera {
  pos: Vec;
  look: Vec;
  fov: number;
}

export interface Visibility {
  object: string;
  visiblePct: number;
  inFrame: boolean;
  pixels: number;
  ok: boolean;
}

export interface Task {
  id: string;
  seed: number;
  kind: Kind;
  tier: 1 | 2 | 3;
  difficulty: { objects: number; lighting: "normal" | "dim" };
  camera: Camera;
  objects: SceneObject[];
  question: string;
  options: string[];
  /** index into options. Ground truth, never sent to a model. */
  answer: number;
  explanation: string;
  visibility: Visibility[];
  width: number;
  height: number;
  /** path under public/, e.g. /bench/images/s1.jpg */
  image: string;
}

export const TIER_LABEL: Record<number, string> = { 1: "Tier 1 · Pose", 2: "Tier 2 · Relative", 3: "Tier 3 · Plausibility" };
