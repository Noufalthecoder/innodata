// node scripts/blender/fetch-assets.mjs
// Downloads CC0 lighting (HDRIs) and floor materials from Poly Haven into assets/polyhaven (git-ignored).
// Poly Haven assets are CC0 (public domain): https://polyhaven.com/license
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const HDRIS = ["brown_photostudio_02", "blue_photo_studio", "blocky_photo_studio", "aircraft_workshop_01", "autoshop_01", "carpentry_shop_02"];
const FLOORS = ["concrete_floor_02", "brushed_concrete", "brown_floor_tiles", "anti_slip_concrete"];
const MAPS = { Diffuse: "diff", Rough: "rough", nor_gl: "nor" };
const RES = "1k";

const OUT = "assets/polyhaven";
mkdirSync(`${OUT}/hdri`, { recursive: true });
mkdirSync(`${OUT}/floor`, { recursive: true });

async function get(url, file) {
  if (existsSync(file)) return;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
const files = async (id) => (await fetch(`https://api.polyhaven.com/files/${id}`)).json();

for (const id of HDRIS) {
  const f = await files(id);
  await get(f.hdri[RES].hdr.url, `${OUT}/hdri/${id}.hdr`);
  console.log("hdri ", id);
}
for (const id of FLOORS) {
  const f = await files(id);
  mkdirSync(`${OUT}/floor/${id}`, { recursive: true });
  for (const [key, name] of Object.entries(MAPS)) await get(f[key][RES].jpg.url, `${OUT}/floor/${id}/${name}.jpg`);
  console.log("floor", id);
}
console.log("done");
