// Generates illustrative images with Gemini and writes them to public/images.
// Usage: node scripts/generate-images.mjs [name-prefix]   e.g. "sample" or "fail-2"
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const envPath = ".env.local";
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error("GEMINI_API_KEY missing (set it in .env.local)");

const MODELS = ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

const STYLE =
  "Photorealistic 3D render, dark near-black deep-space background (#05060f), subtle violet and electric-blue rim lighting, " +
  "clean matte primitive objects (cubes, cylinders, spheres) on a faint reflective grid floor, shallow depth of field, " +
  "premium enterprise technology aesthetic, no text, no logos, no watermark.";

const images = [
  ["sample-1", "4:3", "A red box and a blue cylinder on a grid floor, the camera slightly above, clear depth difference between them."],
  ["sample-2", "4:3", "Three wooden-grey boxes stacked in a slightly offset tower on a grid floor, side-on view, balance looks precarious."],
  ["sample-3", "4:3", "Four primitive objects with one partially hiding another, soft shadows, moderate clutter."],
  ["sample-4", "4:3", "A single open-topped container box rotated about 40 degrees on a grid floor, its open side clearly visible."],
  ["step-1", "4:3", "Top-down wireframe view of a virtual 3D scene being assembled: translucent coordinate axes, glowing position markers above five primitive objects."],
  ["step-2", "4:3", "A rendered scene shown next to its depth map and colored object-mask overlay, side by side panels, glowing violet frames, no text."],
  ["step-3", "4:3", "A holographic vision-AI interface panel analysing a scene of boxes, with green check and red cross markers floating over objects, no text."],
  ["fail-1", "5:4", "Two objects, a blue cylinder far behind a red box, strong perspective that makes the far object look closer."],
  ["fail-2", "5:4", "A tall stack of boxes whose centre of mass clearly overhangs the base, dramatic side lighting."],
  ["fail-3", "5:4", "An open box facing away from the camera, ambiguous orientation, symmetric looking sides."],
  ["fail-4", "5:4", "Five overlapping primitive objects in dense clutter, heavy occlusion, moody lighting."],
  ["fail-5", "5:4", "A dim scene with boxes barely visible in deep shadow, low-light, faint edges."],
];

const filter = process.argv[2];
const todo = images.filter(([n]) => !filter || n.startsWith(filter));

async function generate(prompt, aspectRatio) {
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt} ${STYLE}` }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`${model}: ${json.error?.message ?? res.status}`);
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error(`${model}: no image returned`);
      return { buf: Buffer.from(part.inlineData.data, "base64"), model };
    } catch (e) {
      lastErr = e;
      console.warn("  retrying with next model:", e.message);
    }
  }
  throw lastErr;
}

for (const [name, ratio, prompt] of todo) {
  console.log(`Generating ${name} ...`);
  try {
    const { buf, model } = await generate(prompt, ratio);
    const [w, h] = name.startsWith("fail") ? [760, 600] : name.startsWith("step") ? [800, 600] : [640, 480];
    // Keep 2x resolution for crisp display on retina screens.
    await sharp(buf).resize(w * 2, h * 2, { fit: "cover" }).jpeg({ quality: 88 }).toFile(`public/images/${name}.jpg`);
    console.log(`  ok (${model})`);
  } catch (e) {
    console.error(`  FAILED ${name}: ${e.message}`);
  }
}
