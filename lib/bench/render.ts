import { dot, facesOf, makeProjector, MASK_RGB, norm, sub, cross, mul, add } from "./geometry";
import type { Camera, SceneObject, Vec } from "./types";

type Mode = "rgb" | "mask";
const rgb = (c: number[]) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
const poly = (pts: Vec[], attrs: string) => `<polygon points="${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" ${attrs}/>`;

/** Software renderer: perspective camera, flat shading, soft shadows, grid floor. Returns an SVG string. */
export function renderSvg(objects: SceneObject[], cam: Camera, w: number, h: number, mode: Mode = "rgb", dim = 1): string {
  const P = makeProjector(cam, w, h);
  const faces = facesOf(objects);
  const L = norm([-0.45, -1, -0.35]);
  const toLight = mul(L, -1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  s += `<defs><radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#3b4bff" stop-opacity="0.34"/><stop offset="0.55" stop-color="#7a3dff" stop-opacity="0.14"/><stop offset="1" stop-color="#05060f" stop-opacity="0"/></radialGradient><filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;

  if (mode === "rgb") {
    s += `<rect width="${w}" height="${h}" fill="#05060f"/><rect width="${w}" height="${h}" fill="url(#bg)"/>`;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) s += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h * 0.5).toFixed(1)}" r="${(rnd() * 1.2 + 0.3).toFixed(2)}" fill="#fff" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
    let g = "";
    for (let i = -14; i <= 14; i++)
      for (let k = -16; k < 12; k++) {
        const seg = (a: Vec, b: Vec) => {
          const A = P(a), B = P(b);
          if (A[2] < 0.3 || B[2] < 0.3) return;
          const fade = Math.max(0, 1 - (A[2] + B[2]) / 2 / 28);
          g += `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="#7c8cff" stroke-opacity="${(0.28 * fade * dim).toFixed(3)}"/>`;
        };
        seg([i, 0, k], [i, 0, k + 1]);
        seg([k, 0, i], [k + 1, 0, i]);
      }
    s += `<g stroke-width="1">${g}</g>`;
    let sh = "";
    for (const f of faces) {
      const pts = f.verts.map((p) => {
        const t = p[1] / -L[1];
        return P([p[0] + L[0] * t, 0.001, p[2] + L[2] * t]);
      });
      if (pts.some((p) => p[2] < 0.3)) continue;
      sh += poly(pts, 'fill="#000"');
    }
    s += `<g opacity="${(0.5 * dim + 0.1).toFixed(2)}" filter="url(#blur)">${sh}</g>`;
  } else {
    s += `<rect width="${w}" height="${h}" fill="#0b0d1c"/>`;
  }

  const vis = faces
    .map((f) => {
      const a = sub(f.verts[1], f.verts[0]), b = sub(f.verts[2], f.verts[0]);
      let n = norm(cross(a, b));
      const fc = f.verts.reduce((acc, p) => add(acc, p), [0, 0, 0] as Vec).map((v) => v / f.verts.length) as Vec;
      if (f.smooth) n = norm(sub(fc, f.center));
      else if (dot(n, sub(fc, f.center)) < 0) n = mul(n, -1);
      return { ...f, n, fc, d: Math.hypot(...sub(fc, cam.pos)) };
    })
    .filter((f) => dot(f.n, sub(cam.pos, f.fc)) > 0)
    .sort((x, y) => y.d - x.d);

  for (const f of vis) {
    const pts = f.verts.map(P);
    if (pts.some((p) => p[2] < 0.3)) continue;
    let fill: string, stroke: string;
    if (mode === "mask") {
      fill = stroke = rgb(MASK_RGB[f.id % MASK_RGB.length]);
    } else {
      const diff = Math.max(0, dot(f.n, toLight));
      const k = (0.45 + 0.7 * diff) * dim;
      const fog = Math.min(1, f.d / 30) * 0.5;
      const c = f.color.map((v, i) => v * k * (1 - fog) + [5, 6, 15][i] * fog + (f.n[1] > 0.5 ? 20 * dim : 0));
      fill = rgb(c);
      stroke = rgb(c.map((v) => v + 40));
    }
    s += poly(pts, `fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-linejoin="round"`);
  }
  return s + "</svg>";
}
