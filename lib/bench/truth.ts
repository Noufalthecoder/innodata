// Independent re-derivation of every answer from the raw scene numbers.
// Deliberately does NOT import the generator or geometry helpers, so agreement is real evidence.
import type { Task } from "./types";

type V = [number, number, number];

function pinholeX(cam: Task["camera"], p: V, w: number, h: number): number {
  const f: V = [cam.look[0] - cam.pos[0], cam.look[1] - cam.pos[1], cam.look[2] - cam.pos[2]];
  const fl = Math.hypot(...f);
  const fx = f[0] / fl, fy = f[1] / fl, fz = f[2] / fl;
  // right = forward x up(0,1,0)
  let rx = fy * 0 - fz * 1, rz = fx * 1 - fy * 0;
  const rl = Math.hypot(rx, rz);
  rx /= rl; rz /= rl;
  const d: V = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
  const depth = d[0] * fx + d[1] * fy + d[2] * fz;
  const focal = h / 2 / Math.tan((cam.fov * Math.PI) / 360);
  return w / 2 + (focal * (d[0] * rx + d[2] * rz)) / depth;
}

export function deriveAnswer(t: Task): number {
  if (t.kind === "closer") {
    const d = t.objects.map((o) => Math.hypot(o.center[0] - t.camera.pos[0], o.center[1] - t.camera.pos[1], o.center[2] - t.camera.pos[2]));
    return d.indexOf(Math.min(...d));
  }
  if (t.kind === "leftmost") {
    const xs = t.objects.map((o) => pinholeX(t.camera, o.center, t.width, t.height));
    return xs.indexOf(Math.min(...xs));
  }
  if (t.kind === "orientation") {
    const r = t.objects[0].rotY;
    const fx = Math.sin(r), fz = Math.cos(r);
    if (Math.abs(fz) >= Math.abs(fx)) return fz > 0 ? 0 : 1;
    return fx > 0 ? 3 : 2;
  }
  // stability: sort boxes bottom to top, test centre of mass over the box beneath
  const boxes = t.objects.slice().sort((a, b) => a.center[1] - b.center[1]);
  for (let i = boxes.length - 1; i >= 1; i--) {
    const above = boxes.slice(i);
    const com = above.reduce((s, b) => s + b.center[0], 0) / above.length;
    const half = boxes[i - 1].size[0] / 2;
    if (com < boxes[i - 1].center[0] - half || com > boxes[i - 1].center[0] + half) return 1;
  }
  return 0;
}
