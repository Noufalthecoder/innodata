// Tiny software 3D renderer: builds primitive scenes with known positions and writes
// the landing-page images to public/images. No API, no AI: real geometry, real projection.
// Usage: node scripts/render-scenes.mjs [name-prefix]
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/images", { recursive: true });

// ---------- vector helpers ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
const rotY = (p, pivot, ang) => {
  const [x, y, z] = sub(p, pivot);
  const c = Math.cos(ang), s = Math.sin(ang);
  return add([x * c + z * s, y, -x * s + z * c], pivot);
};

const PALETTE = { red: [229, 72, 77], blue: [62, 99, 221], teal: [18, 165, 148], amber: [245, 165, 36], violet: [142, 78, 198], grey: [139, 141, 152] };
const MASKS = [[255, 80, 80], [80, 200, 255], [120, 255, 120], [255, 220, 80], [200, 120, 255], [255, 140, 200], [140, 255, 230]];

// ---------- primitives -> faces ----------
function boxFaces(c, s, col, id) {
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  const v = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) v.push([c[0] + sx * hx, c[1] + sy * hy, c[2] + sz * hz]);
  const idx = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  return idx.map((q) => ({ verts: q.map((i) => v[i]), col, id, center: c }));
}
function cylFaces(c, r, h, col, id, n = 28) {
  const faces = [];
  const ring = (y) => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), y, c[2] + r * Math.sin((i / n) * Math.PI * 2)]);
  const bot = ring(c[1] - h / 2), top = ring(c[1] + h / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ verts: [bot[i], bot[j], top[j], top[i]], col, id, center: c });
  }
  faces.push({ verts: top, col, id, center: c });
  return faces;
}
function sphereFaces(c, r, col, id, nLat = 16, nLon = 28) {
  const faces = [];
  const pt = (la, lo) => [c[0] + r * Math.sin(la) * Math.cos(lo), c[1] + r * Math.cos(la), c[2] + r * Math.sin(la) * Math.sin(lo)];
  for (let i = 0; i < nLat; i++)
    for (let j = 0; j < nLon; j++) {
      const a0 = (i / nLat) * Math.PI, a1 = ((i + 1) / nLat) * Math.PI, b0 = (j / nLon) * Math.PI * 2, b1 = ((j + 1) / nLon) * Math.PI * 2;
      faces.push({ verts: [pt(a0, b0), pt(a0, b1), pt(a1, b1), pt(a1, b0)], col, id, center: c, smooth: true });
    }
  return faces;
}
function coneFaces(c, r, h, col, id, n = 32) {
  const faces = [];
  const apex = [c[0], c[1] + h / 2, c[2]];
  const ring = Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), c[1] - h / 2, c[2] + r * Math.sin((i / n) * Math.PI * 2)]);
  for (let i = 0; i < n; i++) faces.push({ verts: [ring[i], ring[(i + 1) % n], apex], col, id, center: c, smooth: true });
  return faces;
}
function build(objects) {
  const out = [];
  objects.forEach((o, i) => {
    const col = PALETTE[o.col] ?? o.col;
    const id = o.id ?? i;
    let f = o.t === "cyl" ? cylFaces(o.c, o.r, o.h, col, id) : o.t === "sphere" ? sphereFaces(o.c, o.r, col, id) : o.t === "cone" ? coneFaces(o.c, o.r, o.h, col, id) : boxFaces(o.c, o.s, col, id);
    const pivot = o.pivot ?? o.c;
    if (o.rot) f = f.map((q) => ({ ...q, verts: q.verts.map((p) => rotY(p, pivot, o.rot)), center: rotY(q.center, pivot, o.rot) }));
    out.push(...f);
  });
  return out;
}
// open-front container made of slabs, rotated as one piece
const container = (c, rot, col, id) => [
  { t: "box", c: [c[0], c[1] + 0.05, c[2]], s: [2, 0.1, 2], col, id, rot, pivot: c },
  { t: "box", c: [c[0], c[1] + 0.55, c[2] - 0.95], s: [2, 1, 0.1], col, id, rot, pivot: c },
  { t: "box", c: [c[0] - 0.95, c[1] + 0.55, c[2]], s: [0.1, 1, 2], col, id, rot, pivot: c },
  { t: "box", c: [c[0] + 0.95, c[1] + 0.55, c[2]], s: [0.1, 1, 2], col, id, rot, pivot: c },
];

// ---------- camera / projection ----------
function makeCamera(pos, look, fov, vp) {
  const f = norm(sub(look, pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const fl = vp.h / 2 / Math.tan((fov * Math.PI) / 360);
  return (p) => {
    const d = sub(p, pos);
    const z = dot(d, f);
    return [vp.x + vp.w / 2 + (fl * dot(d, r)) / z, vp.y + vp.h / 2 - (fl * dot(d, u)) / z, z];
  };
}

const rgb = (c) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
const poly = (pts, attrs) => `<polygon points="${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" ${attrs}/>`;

let uid = 0;
// Renders one scene into an svg fragment inside viewport vp. mode: rgb | depth | mask
function renderScene(scene, vp, mode = "rgb") {
  const { objects, cam, look, fov = 30, dim = 1 } = scene;
  const P = makeCamera(cam, look, fov, vp);
  const faces = build(objects);
  const L = norm([-0.45, -1, -0.35]); // direction the light travels
  const toLight = mul(L, -1);
  const clip = `c${uid++}`;
  let s = `<clipPath id="${clip}"><rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" rx="${vp.r ?? 0}"/></clipPath><g clip-path="url(#${clip})">`;

  // background
  if (mode === "rgb") {
    s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="#05060f"/>`;
    s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="url(#bg)"/>`;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) s += `<circle cx="${vp.x + rnd() * vp.w}" cy="${vp.y + rnd() * vp.h * 0.5}" r="${rnd() * 1.2 + 0.3}" fill="#fff" opacity="${0.2 + rnd() * 0.5}"/>`;
  } else {
    s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="${mode === "depth" ? "#05060f" : "#0b0d1c"}"/>`;
  }

  // floor grid
  if (mode === "rgb") {
    let g = "";
    for (let i = -14; i <= 14; i++) {
      for (let k = -16; k < 12; k++) {
        const seg = (a, b) => {
          const A = P(a), B = P(b);
          if (A[2] < 0.3 || B[2] < 0.3) return;
          const fade = Math.max(0, 1 - (A[2] + B[2]) / 2 / 28);
          g += `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="#7c8cff" stroke-opacity="${(0.28 * fade * dim).toFixed(3)}"/>`;
        };
        seg([i, 0, k], [i, 0, k + 1]);
        seg([k, 0, i], [k + 1, 0, i]);
      }
    }
    s += `<g stroke-width="1">${g}</g>`;
  }

  // soft shadows (one group so overlapping shadows do not compound)
  if (mode === "rgb") {
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
  }

  // visible faces, painter's order
  const vis = faces
    .map((f) => {
      const a = sub(f.verts[1], f.verts[0]), b = sub(f.verts[2], f.verts[0]);
      let n = norm(cross(a, b));
      const fc = f.verts.reduce((acc, p) => add(acc, p), [0, 0, 0]).map((v) => v / f.verts.length);
      if (f.smooth) n = norm(sub(fc, f.center)); else if (dot(n, sub(fc, f.center)) < 0) n = mul(n, -1);
      return { ...f, n, fc, d: Math.hypot(...sub(fc, cam)) };
    })
    .filter((f) => dot(f.n, sub(cam, f.fc)) > 0)
    .sort((x, y) => y.d - x.d);

  const dMin = Math.min(...vis.map((f) => f.d)), dMax = Math.max(...vis.map((f) => f.d));
  for (const f of vis) {
    const pts = f.verts.map(P);
    if (pts.some((p) => p[2] < 0.3)) continue;
    let fill, stroke;
    if (mode === "mask") {
      fill = rgb(MASKS[f.id % MASKS.length]);
      stroke = fill;
    } else if (mode === "depth") {
      const v = 255 * (1 - (f.d - dMin) / (dMax - dMin + 1e-6)) * 0.85 + 30;
      fill = rgb([v * 0.8, v * 0.9, v]);
      stroke = fill;
    } else {
      const diff = Math.max(0, dot(f.n, toLight));
      const k = (0.22 + 0.85 * diff) * dim;
      const fog = Math.min(1, f.d / 30) * 0.5;
      const rim = scene.rim ? Math.max(0, dot(f.n, norm([-0.8, 0.25, -0.55]))) : 0;
      const rimCol = [40, 95, 255];
      const c = f.col.map((v, i) => v * k * (1 - fog) + [5, 6, 15][i] * fog + (f.n[1] > 0.5 ? 20 * dim : 0) + rimCol[i] * rim * 0.9);
      fill = rgb(c);
      stroke = rgb(c.map((v) => v + 40));
    }
    s += poly(pts, `fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-linejoin="round"`);
  }
  if (scene.overlay && mode === "rgb") s += scene.overlay(P, vp);
  s += `</g>`;
  if (vp.frame) s += `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" rx="${vp.r ?? 0}" fill="none" stroke="#8b5cf6" stroke-opacity="0.7" stroke-width="2"/>`;
  return s;
}

const wrap = (W, H, body, scale = 2) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#3b4bff" stop-opacity="0.34"/><stop offset="0.55" stop-color="#7a3dff" stop-opacity="0.14"/><stop offset="1" stop-color="#05060f" stop-opacity="0"/></radialGradient>
  <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>${body}</svg>`;

// ---------- overlays ----------
const markers = (items) => (P) =>
  items
    .map(([pt, ok]) => {
      const [x, y] = P(pt);
      const col = ok ? "#34d399" : "#f87171";
      const mark = ok ? `<path d="M${x - 9} ${y} l7 8 l13 -16" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M${x - 9} ${y - 9} l18 18 M${x + 9} ${y - 9} l-18 18" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
      return `<g filter="url(#glow)"><circle cx="${x}" cy="${y}" r="26" fill="#05060f" fill-opacity="0.65" stroke="${col}" stroke-width="3"/>${mark}</g>`;
    })
    .join("");

const axes = (pts) => (P) => {
  const o = P([0, 0.01, 0]);
  let s = "";
  [[[3.5, 0.01, 0], "#f87171"], [[0, 3.5, 0], "#34d399"], [[0, 0.01, 3.5], "#60a5fa"]].forEach(([e, c]) => {
    const t = P(e);
    s += `<line x1="${o[0]}" y1="${o[1]}" x2="${t[0]}" y2="${t[1]}" stroke="${c}" stroke-width="3" filter="url(#glow)"/>`;
  });
  for (const p of pts) {
    const a = P(p), b = P([p[0], 0.01, p[2]]);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#c4b5fd" stroke-dasharray="5 5" stroke-opacity="0.8" stroke-width="2"/>`;
    s += `<circle cx="${a[0]}" cy="${a[1]}" r="7" fill="#a78bfa" filter="url(#glow)"/><circle cx="${b[0]}" cy="${b[1]}" r="4" fill="#fff" opacity="0.9"/>`;
  }
  return s;
};

// ---------- scenes ----------
const stack = (n, x0, dx, col = "grey") =>
  Array.from({ length: n }, (_, i) => ({ t: "box", c: [x0 + dx * i, 0.5 + i, 0], s: [1.4 - i * 0.08, 1, 1.4 - i * 0.08], col: i % 2 ? "amber" : col, rot: i * 0.12 }));

const sceneBasic = { cam: [0, 2.6, 6.5], look: [0, 0.5, -1], objects: [
  { t: "box", c: [-1.3, 0.5, 0.2], s: [1, 1, 1], col: "red", rot: 0.5 },
  { t: "cyl", c: [1.4, 0.6, -3.5], r: 0.5, h: 1.2, col: "blue" },
] };
const sceneClutter = { cam: [-0.3, 2.2, 7], look: [0, 0.6, -1], objects: [
  { t: "box", c: [-0.6, 0.6, 0], s: [1.2, 1.2, 1.2], col: "teal", rot: 0.3 },
  { t: "cyl", c: [-0.2, 0.7, -1.6], r: 0.55, h: 1.4, col: "amber" },
  { t: "box", c: [2, 0.4, -1], s: [0.8, 0.8, 0.8], col: "violet", rot: 0.7 },
  { t: "cyl", c: [-2.5, 0.5, -2.2], r: 0.45, h: 1, col: "grey" },
] };
const sceneContainer = (rot, extra = []) => ({ cam: [0, 3.2, 5.5], look: [0, 0.4, 0], objects: [...container([0, 0, 0], rot, "amber", 0), { t: "box", c: [0.1, 0.3, 0.2], s: [0.5, 0.5, 0.5], col: "blue", rot: rot + 0.4, id: 1 }, ...extra] });
const sceneFiveObj = { cam: [0, 2.8, 6], look: [0, 0.5, -1], objects: [
  { t: "box", c: [-2, 0.5, 0.5], s: [1, 1, 1], col: "red", rot: 0.2 },
  { t: "cyl", c: [-0.8, 0.6, -0.4], r: 0.55, h: 1.2, col: "blue" },
  { t: "box", c: [0.5, 0.45, 0.3], s: [0.9, 0.9, 0.9], col: "teal", rot: 0.8 },
  { t: "box", c: [1.5, 0.5, -0.5], s: [1, 1, 1], col: "amber", rot: -0.3 },
  { t: "cyl", c: [0.2, 0.5, -1.7], r: 0.5, h: 1, col: "violet" },
  { t: "box", c: [-1.3, 0.35, -1.9], s: [0.7, 0.7, 0.7], col: "grey", rot: 0.4 },
] };

const studio = (objects, cam, look, extra = {}) => ({ objects, cam, look, fov: 17, rim: true, ...extra });
const neutral = (objects, cam, look, extra = {}) => ({ objects, cam, look, fov: 30, ...extra });

const IMAGES = {
  // hero collage: isometric cube + cylinder + sphere, blue rim light
  "sample-1": [800, 800, studio([
    { t: "box", c: [-0.9, 0.6, 0], s: [1.2, 1.2, 1.2], col: "violet", rot: 0.6 },
    { t: "cyl", c: [0.9, 0.7, 0.3], r: 0.55, h: 1.4, col: "teal" },
    { t: "sphere", c: [0.1, 0.38, 1.6], r: 0.38, col: "amber" },
  ], [9, 7.5, 9], [0, 0.5, 0.4])],
  "sample-2": [800, 800, studio([
    { t: "cyl", c: [-1.1, 0.8, 0.2], r: 0.6, h: 1.6, col: "blue" },
    { t: "box", c: [0.8, 0.5, -0.4], s: [1, 1, 1], col: "red", rot: -0.5 },
    { t: "sphere", c: [0.6, 0.4, 1.4], r: 0.4, col: "teal" },
  ], [-8, 6.5, 9.5], [0, 0.5, 0.3])],
  "sample-3": [800, 800, studio([
    { t: "box", c: [0, 0.5, 0], s: [1, 1, 1], col: "amber", rot: 0.2 },
    { t: "box", c: [0.05, 1.4, 0], s: [0.8, 0.8, 0.8], col: "violet", rot: 0.7 },
    { t: "cyl", c: [-1.7, 0.45, 0.8], r: 0.45, h: 0.9, col: "blue" },
    { t: "sphere", c: [1.5, 0.4, 0.9], r: 0.4, col: "red" },
  ], [2, 8.5, 11], [0, 0.8, 0.2])],
  // failure gallery cards: box / cylinder / cone at different depths, neutral light, one occluding another
  "fail-1": [800, 800, neutral([
    { t: "box", c: [-0.3, 0.6, 1.2], s: [1.2, 1.2, 1.2], col: "grey", rot: 0.3 },
    { t: "cone", c: [0.4, 0.8, -0.8], r: 0.7, h: 1.6, col: "amber" },
    { t: "cyl", c: [2.2, 0.5, -3.5], r: 0.5, h: 1, col: "blue" },
  ], [0.2, 2.6, 7.5], [0.3, 0.6, -0.5])],
  "fail-2": [800, 800, neutral([
    { t: "cone", c: [-0.8, 0.7, 1.5], r: 0.6, h: 1.4, col: "teal" },
    { t: "box", c: [0.6, 0.55, -0.6], s: [1.1, 1.1, 1.1], col: "red", rot: 0.5 },
    { t: "cyl", c: [2.4, 0.6, -3], r: 0.55, h: 1.2, col: "violet" },
  ], [-0.4, 2.4, 7.5], [0.3, 0.5, -0.5])],
  "fail-3": [800, 800, neutral([
    { t: "cyl", c: [0.2, 0.7, 1.5], r: 0.7, h: 1.4, col: "blue" },
    { t: "box", c: [0.1, 0.5, -0.9], s: [1.2, 1, 1.2], col: "amber", rot: 0.4 },
    { t: "cone", c: [-2.4, 0.7, -1.6], r: 0.6, h: 1.4, col: "teal" },
  ], [0.3, 2.2, 7.5], [-0.2, 0.5, -0.4])],
  "fail-4": [800, 800, neutral([
    { t: "box", c: [-1.8, 0.5, 1.4], s: [1, 1, 1], col: "red", rot: 0.3 },
    { t: "cyl", c: [0, 0.55, -0.6], r: 0.5, h: 1.1, col: "violet" },
    { t: "cone", c: [1.6, 0.75, -3], r: 0.65, h: 1.5, col: "amber" },
  ], [0, 1.4, 8], [0, 0.6, -0.8])],
};

async function out(name, W, H, body, ext = "jpg") {
  await sharp(Buffer.from(wrap(W, H, body)), { density: 72 }).jpeg({ quality: 90 }).toFile(`public/images/${name}.${ext}`);
  console.log("wrote", name);
}

const filter = process.argv[2];
const want = (n) => !filter || n.startsWith(filter);

for (const [name, [W, H, scene]] of Object.entries(IMAGES)) {
  if (!want(name)) continue;
  await out(name, W, H, renderScene(scene, { x: 0, y: 0, w: W, h: H }));
}

// ---------- flat glowing step icons (800x800) ----------
const iconBg = (c) => `<rect width="800" height="800" fill="#05060f"/><rect width="800" height="800" fill="${c}" fill-opacity="0.16"/>
<circle cx="400" cy="400" r="330" fill="url(#ig-${c.slice(1)})"/><defs><radialGradient id="ig-${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity="0.38"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;

// Step 1: wireframe cube under construction from floating nodes
if (want("step-1")) {
  const c = "#4f8bff";
  const o = [400, 410], k = 150;
  const iso = (x, y, z) => [o[0] + (x - z) * k * 0.866, o[1] + (x + z) * k * 0.5 - y * k];
  const V = { a: iso(0, 0, 0), b: iso(1, 0, 0), c: iso(1, 0, 1), d: iso(0, 0, 1), e: iso(0, 1, 0), f: iso(1, 1, 0), g: iso(1, 1, 1), h: iso(0, 1, 1) };
  const solid = [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"], ["e", "f"], ["f", "g"], ["g", "h"], ["a", "e"], ["b", "f"], ["c", "g"]];
  const dashed = [["h", "e"], ["d", "h"]];
  const P = (n) => V[n].map((v) => v.toFixed(1)).join(" ");
  let b = iconBg(c) + `<g filter="url(#glow)" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round">`;
  for (const [p, q] of solid) b += `<path d="M${P(p)} L${P(q)}"/>`;
  b += `</g><g fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round" opacity="0.9">`;
  for (const [p, q] of dashed) b += `<path d="M${P(p)} L${P(q)}"/>`;
  b += `</g><g filter="url(#glow)">`;
  for (const n of Object.keys(V)) b += `<circle cx="${V[n][0]}" cy="${V[n][1]}" r="14" fill="#cfe0ff"/><circle cx="${V[n][0]}" cy="${V[n][1]}" r="24" fill="none" stroke="${c}" stroke-width="3" opacity="0.6"/>`;
  // floating nodes still travelling in
  [[170, 200], [640, 170], [690, 560], [130, 600], [560, 700]].forEach(([x, y], i) => {
    const t = V[["h", "e", "g", "d", "c"][i]];
    b += `<path d="M${x} ${y} L${t[0]} ${t[1]}" stroke="${c}" stroke-width="2" stroke-dasharray="3 10" opacity="0.5"/><circle cx="${x}" cy="${y}" r="9" fill="${c}"/>`;
  });
  b += `</g>`;
  await out("step-1", 800, 800, b);
}

// Step 2: chat bubble with a question mark merging into an eye
if (want("step-2")) {
  const c = "#8b5cf6", l = "#d8c8ff";
  let b = iconBg(c) + `<g filter="url(#glow)" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M140 250 Q140 190 200 190 H470 Q530 190 530 250 V400 Q530 460 470 460 H320 L230 540 V460 H200 Q140 460 140 400 Z"/>
  </g>
  <g filter="url(#glow)" fill="none" stroke="${l}" stroke-width="12" stroke-linecap="round">
    <path d="M285 275 Q285 235 335 235 Q385 235 385 280 Q385 310 345 328 Q335 335 335 355"/>
  </g><circle cx="335" cy="400" r="9" fill="${l}" filter="url(#glow)"/>
  <g filter="url(#glow)" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M420 470 Q560 350 700 470 Q560 590 420 470 Z" fill="#05060f" fill-opacity="0.85"/>
    <circle cx="560" cy="470" r="48" fill="none"/>
  </g>
  <circle cx="560" cy="470" r="22" fill="${l}" filter="url(#glow)"/><circle cx="548" cy="458" r="7" fill="#fff"/>
  <g stroke="${c}" stroke-width="3" opacity="0.6" stroke-dasharray="3 10" stroke-linecap="round"><path d="M530 330 L560 410"/><path d="M600 560 L640 640"/><path d="M500 560 L470 640"/></g>`;
  await out("step-2", 800, 800, b);
}

// Step 3: checkmark inside a shield with circuit lines
if (want("step-3")) {
  const c = "#2dd4bf";
  let b = iconBg(c);
  const lines = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]];
  b += `<g stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.75">`;
  lines.forEach(([dx, dy], i) => {
    const sx = 400 + dx * 140, sy = 400 + dy * 150, ex = 400 + dx * 300, ey = 400 + dy * 300;
    const mx = dx === 0 ? ex : sx + dx * 60;
    b += `<path d="M${sx} ${sy} L${dx === 0 ? sx : mx} ${dx === 0 ? sy : sy} L${ex} ${ey}"/><circle cx="${ex}" cy="${ey}" r="11" fill="#05060f"/>`;
  });
  b += `</g><g filter="url(#glow)" stroke="${c}" stroke-width="10" fill="#05060f" fill-opacity="0.85" stroke-linejoin="round">
    <path d="M400 190 L560 245 V400 Q560 520 400 600 Q240 520 240 400 V245 Z"/></g>
  <path d="M325 400 L383 458 L485 340" fill="none" stroke="#c9fff6" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`;
  await out("step-3", 800, 800, b);
}

