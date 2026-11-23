import type { Camera, SceneObject, Task, Vec } from "../../lib/bench/types";

export const CAM: Camera = { pos: [0, 2.6, 7], look: [0, 0.5, -1], fov: 30 };

export function box(id: number, center: Vec, size: Vec = [1, 1, 1], rotY = 0): SceneObject {
  return { id, shape: "box", color: "amber", center, size, rotY };
}
export function sphere(id: number, center: Vec, r = 0.45): SceneObject {
  return { id, shape: "sphere", color: "red", center, size: [2 * r, 2 * r, 2 * r], rotY: 0 };
}

/** A minimal task for testing ground-truth rules directly, bypassing the generator. */
export function makeTask(partial: Partial<Task> & Pick<Task, "kind" | "objects">): Task {
  return {
    id: "t",
    seed: 1,
    tier: 2,
    difficulty: { objects: partial.objects.length, lighting: "normal" },
    camera: CAM,
    question: "q",
    options: partial.objects.map((_, i) => `option ${i}`),
    answer: 0,
    explanation: "",
    visibility: [],
    width: 960,
    height: 720,
    image: "",
    ...partial,
  };
}
