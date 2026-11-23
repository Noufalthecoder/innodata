// Generates placeholder JPGs in public/images. Replace them with real renders later.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/images", { recursive: true });

const files = [
  ...[1, 2, 3, 4].map((n) => [`sample-${n}.jpg`, `Sample scene ${n}`, 640, 480]),
  ...[1, 2, 3].map((n) => [`step-${n}.jpg`, `Step ${n}`, 800, 600]),
  ...[1, 2, 3, 4, 5].map((n) => [`fail-${n}.jpg`, `Failure ${n}`, 760, 600]),
];

const hues = [230, 260, 190, 280, 210, 250];

for (const [i, [name, label, w, h]] of files.entries()) {
  const hue = hues[i % hues.length];
  const cubes = Array.from({ length: 4 }, (_, k) => {
    const x = 90 + ((k * 173 + i * 61) % (w - 220));
    const y = 120 + ((k * 97 + i * 43) % (h - 260));
    const s = 50 + ((k * 31 + i * 17) % 60);
    return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="6" fill="hsl(${hue + k * 25},70%,55%)" opacity="0.85" transform="rotate(${k * 17 - 20} ${x + s / 2} ${y + s / 2})"/>`;
  }).join("");
  const lines = Array.from({ length: 12 }, (_, k) => `<line x1="0" y1="${h * 0.55 + k * 26}" x2="${w}" y2="${h * 0.55 + k * 26}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},60%,14%)"/><stop offset="1" stop-color="hsl(${hue + 40},70%,6%)"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g stroke="rgba(255,255,255,0.08)">${lines}</g>
    ${cubes}
    <text x="24" y="${h - 24}" fill="#cbd5ff" font-family="sans-serif" font-size="22">${label} (placeholder)</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(`public/images/${name}`);
}
console.log(`Wrote ${files.length} placeholder images.`);
