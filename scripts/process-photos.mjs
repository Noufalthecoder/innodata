// Prepares NASA public-domain photos for the site. Sources are fetched from images.nasa.gov (ids below)
// into assets-src/ (git-ignored). Credit: NASA.
import sharp from "sharp";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";

mkdirSync("assets-src", { recursive: true });
const ids = ["iss072e340644", "as11-40-5903", "as08-14-2383"];
for (const id of ids) {
  const f = `assets-src/${id}.jpg`;
  if (existsSync(f)) continue;
  const r = await fetch(`https://images-assets.nasa.gov/image/${id}/${id}~large.jpg`);
  if (!r.ok) throw new Error(`download failed: ${id}`);
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
}
const out = (name) => `public/images/${name}.jpg`;

// Hero: orbital sunrise over Earth (ISS)
await sharp("assets-src/iss072e340644.jpg").modulate({ brightness: 1.05 }).jpeg({ quality: 88 }).toFile(out("hero-bg"));
// Section strip: Earthrise over the lunar horizon (Apollo 8)
await sharp("assets-src/as08-14-2383.jpg").extract({ left: 0, top: 760, width: 1920, height: 900 }).jpeg({ quality: 88 }).toFile(out("horizon"));
// About: astronaut on the Moon (Apollo 11)
// Social preview 1200x630: sunrise limb, left side darkened for a title
const dark = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#02030a" stop-opacity="0.92"/><stop offset="0.55" stop-color="#02030a" stop-opacity="0.55"/><stop offset="1" stop-color="#02030a" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
await sharp("assets-src/iss072e340644.jpg").resize(1200, 630, { fit: "cover", position: "top" }).composite([{ input: dark }]).jpeg({ quality: 88 }).toFile(out("og"));
console.log("photos ready");
