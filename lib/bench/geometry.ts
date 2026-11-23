import type { Camera, ColorName, SceneObject, Vec } from "./types";

export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: Vec): Vec => mul(a, 1 / (len(a) || 1));

export function rotY(p: Vec, pivot: Vec, ang: number): Vec {
  const [x, y, z] = sub(p, pivot);
  const c = Math.cos(ang), s = Math.sin(ang);
  return add([x * c + z * s, y, -x * s + z * c], pivot);
}

export const COLOR_RGB: Record<ColorName, [number, number, number]> = {
  red: [229, 72, 77],
  blue: [90, 140, 255],
  teal: [18, 165, 148],
  amber: [245, 165, 36],
  violet: [165, 105, 225],
  grey: [170, 172, 184],
};

export const MASK_RGB: [number, number, number][] = [
  [255, 80, 80], [80, 200, 255], [120, 255, 120], [255, 220, 80], [200, 120, 255], [255, 140, 200], [140, 255, 230],
];

export interface Face {
  verts: Vec[];
  color: [number, number, number];
  id: number;
  center: Vec;
  smooth: boolean;
}

function boxFaces(o: SceneObject): Face[] {
  const [hx, hy, hz] = [o.size[0] / 2, o.size[1] / 2, o.size[2] / 2];
  const c = o.center;
  const v: Vec[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) v.push([c[0] + sx * hx, c[1] + sy * hy, c[2] + sz * hz]);
  const idx = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  return idx.map((q) => ({ verts: q.map((i) => v[i]), color: COLOR_RGB[o.color], id: o.id, center: c, smooth: false }));
}

function cylinderFaces(o: SceneObject, n = 28): Face[] {
  const r = o.size[0] / 2, h = o.size[1], c = o.center;
  const ring = (y: number): Vec[] => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), y, c[2] + r * Math.sin((i / n) * Math.PI * 2)]);
  const bot = ring(c[1] - h / 2), top = ring(c[1] + h / 2);
  const faces: Face[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ verts: [bot[i], bot[j], top[j], top[i]], color: COLOR_RGB[o.color], id: o.id, center: c, smooth: false });
  }
  faces.push({ verts: top, color: COLOR_RGB[o.color], id: o.id, center: c, smooth: false });
  return faces;
}

function sphereFaces(o: SceneObject, nLat = 16, nLon = 28): Face[] {
  const r = o.size[0] / 2, c = o.center;
  const pt = (la: number, lo: number): Vec => [c[0] + r * Math.sin(la) * Math.cos(lo), c[1] + r * Math.cos(la), c[2] + r * Math.sin(la) * Math.sin(lo)];
  const faces: Face[] = [];
  for (let i = 0; i < nLat; i++)
    for (let j = 0; j < nLon; j++) {
      const a0 = (i / nLat) * Math.PI, a1 = ((i + 1) / nLat) * Math.PI, b0 = (j / nLon) * Math.PI * 2, b1 = ((j + 1) / nLon) * Math.PI * 2;
      faces.push({ verts: [pt(a0, b0), pt(a0, b1), pt(a1, b1), pt(a1, b0)], color: COLOR_RGB[o.color], id: o.id, center: c, smooth: true });
    }
  return faces;
}

function coneFaces(o: SceneObject, n = 32): Face[] {
  const r = o.size[0] / 2, h = o.size[1], c = o.center;
  const apex: Vec = [c[0], c[1] + h / 2, c[2]];
  const ring: Vec[] = Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), c[1] - h / 2, c[2] + r * Math.sin((i / n) * Math.PI * 2)]);
  return ring.map((p, i) => ({ verts: [p, ring[(i + 1) % n], apex], color: COLOR_RGB[o.color], id: o.id, center: c, smooth: true }));
}

export function facesOf(objects: SceneObject[]): Face[] {
  const out: Face[] = [];
  for (const o of objects) {
    let f = o.shape === "box" ? boxFaces(o) : o.shape === "cylinder" ? cylinderFaces(o) : o.shape === "sphere" ? sphereFaces(o) : coneFaces(o);
    if (o.rotY) {
      const pivot = o.pivot ?? o.center;
      f = f.map((q) => ({ ...q, verts: q.verts.map((p) => rotY(p, pivot, o.rotY)), center: rotY(q.center, pivot, o.rotY) }));
    }
    out.push(...f);
  }
  return out;
}

/** Pinhole projection. Returns [screenX, screenY, depthAlongView]. */
export function makeProjector(cam: Camera, w: number, h: number) {
  const f = norm(sub(cam.look, cam.pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const focal = h / 2 / Math.tan((cam.fov * Math.PI) / 360);
  return (p: Vec): Vec => {
    const d = sub(p, cam.pos);
    const z = dot(d, f);
    return [w / 2 + (focal * dot(d, r)) / z, h / 2 - (focal * dot(d, u)) / z, z];
  };
}

export const objectName = (o: SceneObject) => `${o.color} ${o.shape}`;
