import sharp from "sharp";
import { len, makeProjector, objectName, sub } from "./geometry";
import { renderSvg } from "./render";
import { makeRng } from "./rng";
import { styleFor } from "./style";
import type { Camera, ColorName, Kind, SceneObject, Shape, Task, Vec } from "./types";
import { checkVisibility } from "./visibility";

export const WIDTH = 960;
export const HEIGHT = 720;
const COLORS: ColorName[] = ["red", "blue", "teal", "amber", "violet", "grey"];
const SHAPES: Shape[] = ["box", "cylinder", "sphere", "cone"];
const DEFAULT_CAM: Camera = { pos: [0, 2.6, 7], look: [0, 0.5, -1], fov: 30 };
const ORIENT_CAM: Camera = { pos: [0, 3.2, 5.5], look: [0, 0.4, 0], fov: 30 };

export interface GenOptions {
  kind: Kind;
  seed: number;
  objects?: number; // 2-5 for relative tasks, 2-4 boxes for stacks
  lighting?: "normal" | "dim";
  /** stability tasks only: force the outcome (true = stands, false = falls). Defaults to a hash of the seed. */
  stable?: boolean;
}

export const KIND_TIER: Record<Kind, 1 | 2 | 3> = { orientation: 1, closer: 2, leftmost: 2, stability: 3 };

export const stackCamera = (n: number): Camera => ({ pos: [3.5 + n * 0.5, 1.6 + n * 0.35, 6 + n * 1.2], look: [0.3, n * 0.5, 0], fov: 32 });

/** Everything a stack needs: equal boxes, equal density, offsets along x. */
export const STACK_BOX: Vec = [1.5, 1, 1.5];

function randomObject(rng: ReturnType<typeof makeRng>, id: number, color: ColorName): SceneObject {
  const shape = rng.pick(SHAPES);
  const x = rng.between(-2.8, 2.8), z = rng.between(-5, 1.2);
  if (shape === "box") {
    const a = rng.between(0.8, 1.2);
    return { id, shape, color, center: [x, a / 2, z], size: [a, a, a], rotY: rng.between(0, 1.5) };
  }
  if (shape === "cylinder") {
    const r = rng.between(0.4, 0.55), h = rng.between(0.9, 1.3);
    return { id, shape, color, center: [x, h / 2, z], size: [2 * r, h, 2 * r], rotY: 0 };
  }
  if (shape === "sphere") {
    const r = rng.between(0.4, 0.5);
    return { id, shape, color, center: [x, r, z], size: [2 * r, 2 * r, 2 * r], rotY: 0 };
  }
  const h = rng.between(1, 1.4);
  return { id, shape, color, center: [x, h / 2, z], size: [1, h, 1], rotY: 0 };
}

/** Open-front container (floor + 3 walls) built from slabs that share one id and rotate around one pivot. */
export function containerParts(id: number, rotY: number): SceneObject[] {
  const pivot: Vec = [0, 0, 0];
  const mk = (center: Vec, size: Vec): SceneObject => ({ id, shape: "box", color: "amber", center, size, rotY, pivot });
  // walls meet without overlapping, so no coplanar faces (avoids rendering seams)
  return [mk([0, 0.05, 0], [2, 0.1, 2]), mk([0, 0.6, -0.95], [2, 1, 0.1]), mk([-0.95, 0.6, 0.05], [0.1, 1, 1.9]), mk([0.95, 0.6, 0.05], [0.1, 1, 1.9])];
}

/** The open side faces local +z. After rotY(r) it faces (sin r, 0, cos r). */
export const facingOf = (rotY: number): Vec => [Math.sin(rotY), 0, Math.cos(rotY)];

export const ORIENT_OPTIONS = ["Toward the camera", "Away from the camera", "To the left in the image", "To the right in the image"];

/** Stability rule: the centre of mass of everything above each box must lie over that box's top face. */
export function stackAnalysis(xs: number[], width: number) {
  const checks: { level: number; com: number; lo: number; hi: number; margin: number }[] = [];
  for (let i = xs.length - 1; i >= 1; i--) {
    const above = xs.slice(i);
    const com = above.reduce((a, b) => a + b, 0) / above.length;
    const lo = xs[i - 1] - width / 2, hi = xs[i - 1] + width / 2;
    checks.push({ level: i, com, lo, hi, margin: Math.min(com - lo, hi - com) });
  }
  return { checks, stable: checks.every((c) => c.margin >= 0) };
}

/** Well-mixed bit from a seed (sequential seeds must not give correlated outcomes). */
function hashBit(seed: number): boolean {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h & 1) === 1;
}

async function finish(base: Omit<Task, "image" | "visibility">, subjectIds: number[], dim: number) {
  const visibility = await checkVisibility(base.objects, subjectIds, base.camera, WIDTH, HEIGHT);
  if (!visibility.every((v) => v.ok)) return null;
  const svg = renderSvg(base.objects, base.camera, WIDTH, HEIGHT, "rgb", dim);
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  return { task: { ...base, visibility, image: "" } as Task, jpeg };
}

/** Deterministic: the same seed always rebuilds the same task. Retries internally until the visibility check passes. */
export async function generateTask(opts: GenOptions): Promise<{ task: Task; jpeg: Buffer }> {
  const lighting = opts.lighting ?? "normal";
  const dim = lighting === "dim" ? 0.4 : 1;
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = makeRng(opts.seed * 1009 + attempt);
    const id = `s${opts.seed}`;
    const common = { id, seed: opts.seed, kind: opts.kind, tier: KIND_TIER[opts.kind], width: WIDTH, height: HEIGHT, render: styleFor(opts.seed) };

    if (opts.kind === "closer" || opts.kind === "leftmost") {
      const n = opts.objects ?? 3;
      const colors = rng.shuffle(COLORS).slice(0, n);
      const objects = colors.map((c, i) => randomObject(rng, i, c));
      if (objects.some((a, i) => objects.some((b, j) => j > i && Math.hypot(a.center[0] - b.center[0], a.center[2] - b.center[2]) < 1.5))) continue;
      const names = objects.map((o) => objectName(o));
      let answer: number, question: string, explanation: string;
      if (opts.kind === "closer") {
        const d = objects.map((o) => len(sub(o.center, DEFAULT_CAM.pos)));
        const sorted = d.slice().sort((a, b) => a - b);
        if (sorted[1] - sorted[0] < 0.8) continue;
        answer = d.indexOf(sorted[0]);
        question = "Which object is closest to the camera?";
        explanation = `Distance from the camera to each object's centre: ${names.map((nm, i) => `${nm} = ${d[i].toFixed(2)} m`).join(", ")}. Smallest: ${names[answer]}.`;
      } else {
        const P = makeProjector(DEFAULT_CAM, WIDTH, HEIGHT);
        const xs = objects.map((o) => P(o.center)[0]);
        const sorted = xs.slice().sort((a, b) => a - b);
        if (sorted[1] - sorted[0] < 90) continue;
        answer = xs.indexOf(sorted[0]);
        question = "Which object appears furthest to the left in the image?";
        explanation = `Horizontal pixel position of each object's centre: ${names.map((nm, i) => `${nm} = ${xs[i].toFixed(0)} px`).join(", ")}. Smallest: ${names[answer]}.`;
      }
      const r = await finish(
        { ...common, difficulty: { objects: n, lighting }, camera: DEFAULT_CAM, objects, question, options: names.map((nm) => `The ${nm}`), answer, explanation },
        objects.map((o) => o.id),
        dim
      );
      if (r) return r;
      continue;
    }

    if (opts.kind === "orientation") {
      const quarter = rng.pick([0, 1, 2, 3]);
      const rot = (quarter * Math.PI) / 2 + rng.between(-0.3, 0.3);
      const facing = facingOf(rot);
      // camera sits at +z looking toward -z, so +z points toward the camera and +x is image-right
      const answer = Math.abs(facing[2]) >= Math.abs(facing[0]) ? (facing[2] > 0 ? 0 : 1) : facing[0] > 0 ? 3 : 2;
      const objects = containerParts(0, rot);
      const r = await finish(
        {
          ...common,
          difficulty: { objects: 1, lighting },
          camera: ORIENT_CAM,
          objects,
          question: "The open side of this container faces which way?",
          options: ORIENT_OPTIONS,
          answer,
          explanation: `The container is rotated ${((rot * 180) / Math.PI).toFixed(0)} degrees, so its open side points along (${facing[0].toFixed(2)}, ${facing[2].toFixed(2)}) in the ground plane. Camera looks along -z, so +z is toward the camera and +x is image-right.`,
        },
        [0],
        dim
      );
      if (r) return r;
      continue;
    }

    // stability
    const n = opts.objects ?? 3;
    const wantStable = opts.stable ?? hashBit(opts.seed);
    const xs = [0];
    // A 2-box stack only falls if the top box overhangs the support edge (0.75) by a clear margin, so the first step must be large.
    for (let i = 1; i < n; i++) xs.push(xs[i - 1] + (wantStable ? rng.between(-0.25, 0.25) : i === 1 ? rng.between(0.95, 1.3) : rng.between(0.3, 0.9)));
    const a = stackAnalysis(xs, STACK_BOX[0]);
    if (a.stable !== wantStable || a.checks.some((c) => Math.abs(c.margin) < 0.12)) continue;
    const cols: ColorName[] = ["amber", "violet", "teal", "red"];
    const objects: SceneObject[] = xs.map((x, i) => ({ id: i, shape: "box", color: cols[i], center: [x, 0.5 + i, 0], size: STACK_BOX, rotY: 0 }));
    const camera = stackCamera(n);
    const detail = a.checks.map((c) => `above level ${c.level}: centre of mass x = ${c.com.toFixed(2)} m vs support ${c.lo.toFixed(2)} to ${c.hi.toFixed(2)} m`).join("; ");
    const r = await finish(
      {
        ...common,
        gen: { stable: wantStable },
        difficulty: { objects: n, lighting },
        camera,
        objects,
        question: `Will this stack of ${n} boxes stay standing, or will it fall?`,
        options: ["It stays standing", "It falls"],
        answer: a.stable ? 0 : 1,
        explanation: `Rule: stable only if the centre of mass of everything above each box lies over that box's top face. ${detail}. ${a.stable ? "All checks pass." : "A check fails."}`,
      },
      objects.map((o) => o.id),
      dim
    );
    if (r) return r;
  }
  throw new Error(`could not build a valid ${opts.kind} task for seed ${opts.seed}`);
}
